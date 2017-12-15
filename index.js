const serverless = require('serverless-http')
const AWS = require('aws-sdk')
const express = require('express')
const elasticsearch = require('elasticsearch')
const cors = require('cors')
const bodyParser = require('body-parser')
const app = express()

const ES_INDEX = process.env.ES_INDEX || 'spacetime-graph'
const ES_HOST = process.env.ES_HOST || 'search-spacetime-xkle7kerddv3nlg54irycxefpi.us-east-1.es.amazonaws.com'
const ES_PORT = process.env.ES_PORT || 443
const AWS_PROFILE = process.env.AWS_PROFILE

let opts = {
  host: [
    {
      host: ES_HOST,
      protocol: 'https',
      port: ES_PORT
    }
  ],
  log: 'trace'
}

if (AWS_PROFILE) {
  opts.connectionClass = require('http-aws-es')
  opts.amazonES = {
    region: 'us-east-1',
    credentials: new AWS.SharedIniFileCredentials({ profile: AWS_PROFILE })
  }
}

// Instantiate ElasticSearch Client
const esClient = new elasticsearch.Client(opts)

function featureModel (object, objectKey) {
  return {
    type: 'Feature',
    properties: {
      id: object[objectKey].id,
      dataset: object[objectKey].dataset,
      name: object[objectKey].name,
      type: object[objectKey].type,
      validSince: object[objectKey].validSince,
      validUntil: object[objectKey].validUntil,
      data: object[objectKey].data
    },
    geometry: object[objectKey].geometry
  }
}

function toFeature (object, objectKey) {
  if (Array.isArray(object) && object.length) {
    return {
      type: 'FeatureCollection',
      features: object.map(elem => featureModel(elem, objectKey))
    }
  }

  return featureModel(object, objectKey)
}

function baseQuery (pageSize) {
  const pgSize = pageSize || 100

  return {
    size: pgSize,
    query: {
      bool: {
        must: []
      }
    }
  }
}

function sendNotAcceptable (res, error) {
  res.status(406).json({
    error
  })
}

function queryElasticSearch (index, query, res, resultStyle) {
  if (!index) {
    res.status(400).json({
      error: 'The Elasticsearch [INDEX] is undefined'
    })
  }

  if (!query || query.length === 0) {
    res.status(400).json({
      error: 'The Elasticsearch [QUERY] object is undefined or empty'
    })
  }

  esClient.search({ index: index, body: query }).then(resp => {
    const totalHits = resp.hits.total || 0
    const data = resp.hits.hits

    if (totalHits <= 0) {
      res.status(404).json({
        result: 'Not Found'
      })
    }

    if (resultStyle === 'single') {
      res.send(toFeature(data[0], '_source'))
    } else {
      res.send(toFeature(data, '_source'))
    }
  }, (err) => {
    res.status(400).json({
      error: err.message
    })
  })
}

// Configuration
app.use(bodyParser.json({ strict: false }))
app.use(cors())
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

// Index Route
app.get('/', (req, res) => {
  res.send({
    title: 'NYC Space/Time Directory API'
  })
})

app.get('/datasets/:datasetId/objects/:objectId', (req, res) => {
  const { datasetId, objectId } = req.params
  // Handle errors for missing query params
  if (typeof datasetId !== 'string' || datasetId === '') {
    res.status(400).json({
      error: 'The :datasetId query parameter was undefined or empty'
    })
  } else if (typeof objectId !== 'string' || objectId === '') {
    res.status(400).json({
      error: 'The :objectId query parameter was undefined or empty'
    })
  }

  const searchQuery = {
    query: {
      nested: {
        path: 'data',
        query: {
          nested: {
            path: 'data.objects',
            query: {
              match: {
                'data.objects.id': `${datasetId}/${objectId}`
              }
            }
          }
        }
      }
    }
  }

  queryElasticSearch(ES_INDEX, searchQuery, res, 'single')
})

app.get('/search', (req, res) => {
  let query = baseQuery()

  if (req.query.name) {
    const name = req.query.name
    const field = 'name.analyzed'

    query.query.bool.must.push({
      query_string: {
        query: name,
        fields: [field]
      }
    })
  }

  if (req.query.types) {
    const types = req.query.types.split(',').map(type => ({
      type: {
        value: type
      }
    }))

    query.query.bool.must.push({
      bool: {
        should: types
      }
    })
  }

  if (req.query.since || req.query.until) {
    query.query.bool.filter = []

    // Add valid since
    if (req.query.since) {
      const since = `${req.query.since}-01-01`
      query.query.bool.filter.push({
        range: {
          validSince: {
            gte: since
          }
        }
      })
    }

    // Add valid until
    if (req.query.until) {
      const until = `${req.query.until}-12-31`
      query.query.bool.filter.push({
        range: {
          validUntil: {
            lte: until
          }
        }
      })
    }
  }

  if (req.query.geometry) {
    const validGeometryOperations = [
      'contains',
      'intersects'
    ]

    let geometryOperation = req.query['geometry-operation']

    if (!geometryOperation) {
      geometryOperation = validGeometryOperations[0]
    } else if (!validGeometryOperations.includes(geometryOperation)) {
      sendNotAcceptable(res, `geometry-operation must be one of: ${validGeometryOperations.join(', ')}`)
      return
    }

    const coordinates = req.query.geometry.split(',')

    // TODO: check if coordinates is 4 numbers!

    const northWest = {
      lat: coordinates[0],
      lon: coordinates[1]
    }

    const southEast = {
      lat: coordinates[2],
      lon: coordinates[3]
    }

    if (geometryOperation === 'contains') {
      query.query.bool.must.push({
        bool: {
          should: [
            {
              geo_bounding_box: {
                northWest: {
                  top_left: northWest,
                  bottom_right: southEast
                }
              }
            },
            {
              geo_bounding_box: {
                southEast: {
                  top_left: northWest,
                  bottom_right: southEast
                }
              }
            }
          ]
        }
      })
    } else {
      query.query.bool.must.push({
        bool: {
          filter: [
            {
              geo_bounding_box: {
                northWest: {
                  top_left: northWest,
                  bottom_right: southEast
                }
              }
            },
            {
              geo_bounding_box: {
                southEast: {
                  top_left: northWest,
                  bottom_right: southEast
                }
              }
            },
            {
              geo_bounding_box: {
                southWest: {
                  top_left: northWest,
                  bottom_right: southEast
                }
              }
            },
            {
              geo_bounding_box: {
                northEast: {
                  top_left: northWest,
                  bottom_right: southEast
                }
              }
            }
          ]
        }
      })
    }
  }

  queryElasticSearch(ES_INDEX, query, res)
})

module.exports.handler = serverless(app)
