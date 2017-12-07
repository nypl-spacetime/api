const express = require('express')
const elasticsearch = require('spacetime-db-elasticsearch')
const cors = require('cors')
const app = express()

app.use(cors())

const port = process.env.PORT || 3001

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

function toFeature (object) {
  return {
    type: 'Feature',
    properties: {
      id: object.id,
      dataset: object.dataset,
      name: object.name,
      type: object.type,
      validSince: object.validSince,
      validUntil: object.validUntil,
      data: object.data
    },
    geometry: object.geometry
  }
}

function search (params, res) {
  elasticsearch.search(params, (err, objects) => {
    if (err || !objects) {
      const message = err.message || 'Invalid data received'
      res.status(500).send(message)
    } else {
      res.send({
        type: 'FeatureCollection',
        features: objects.map(toFeature)
      })
    }
  })
}

app.get('/', (req, res) => {
  res.send({
    title: 'NYC Space/Time Directory API'
  })
})

app.get('/datasets/:datasetId/objects/:objectId', (req, res) => {
  const params = {
    datasetIds: [req.params.datasetId],
    id: req.params.objectId
  }

  search(params, res)
})

app.get('/search', (req, res) => {
  let params = {}

  if (req.query.name) {
    params.name = req.query.name
  }

  if (req.query.dataset) {
    params.dataset = req.query.dataset.split(',')
  }

  if (req.query.type) {
    params.type = req.query.type.split(',')
  }

  if (req.query.before) {
    params.before = `${req.query.before}-12-31`
  }

  if (req.query.after) {
    params.after = `${req.query.after}-01-01`
  }

  if (req.query.geometry) {
    let rect = req.query.geometry.split(',').map((c) => parseFloat(c))
    params.geometry = [
      [
        rect[0],
        rect[1]
      ],
      [
        rect[2],
        rect[3]
      ]
    ]
  }

  if (req.query['geometry-operation']) {
    const operation = req.query['geometry-operation']
    validOperations = [
      'contains',
      'intersects'
    ]

    params.geometryOperation = validOperations.includes(operation) ? operation : validOperations[0]
  }

  search(params, res)
})

app.listen(port, () => {
  console.log('NYC Space/Time Directory API listening on port ' + port)
})
