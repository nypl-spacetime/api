var express = require('express')
var request = require('request')
// var pitsToGeoJSON = require('pits-to-geojson')
var normalizer = require('histograph-uri-normalizer')
var io = require('spacetime-io')
var elasticsearch = require('spacetime-db-elasticsearch')
var neo4j = require('spacetime-db-neo4j')
var cors = require('cors')
var app = express()

// Mount Space/Time IO
app.use('/', io)

app.use(cors())

var port = process.env.PORT || 3001

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

// Expand Histograph URNs
function expandURN(id) {
  try {
    id = normalizer.URNtoURL(id)
  } catch (e) {
    // TODO: use function from uri-normalizer
    id = id.replace('urn:hgid:', '')
  }

  return id
}

// Given an PIT or a hair, expand ID to URN,
// and only allow either ID or URI
function idOrUri(obj) {
  var id = expandURN(obj.id)

  var isHgid = obj.id.indexOf('urn:hgid:') === 0

  // check whether obj has an URI field
  // if the expandURNed obj.id equals obj.id itself,
  // obj.id matches uri-normalizer's URI pattern: obj.id is an URI
  if (!isHgid || obj.uri || (id === obj.id)) {
    obj.uri = id
    delete obj.id
  } else {
    obj.id = id
    delete obj.uri
  }

  return obj
}

app.get('/', function (req, res) {
  res.send({
    title: 'Space/Time Directory API'
  })
})

app.get('/building-inspect-sheets', function (req, res) {
  request('http://buildinginspector.nypl.org/api/sheets/')
    .pipe(res)
})

app.get('/persons-in-pit', function (req, res) {
  var query = `
    MATCH (b:_) WHERE b.id IN [{buildingId}]
    // find corresponding equivalence classes (ECs)
    OPTIONAL MATCH (b)<-[:\`=\`]-(bConcept:\`=\`)
    // choose the right node (EC if there, otherwise only member)
    WITH coalesce(bConcept, b) AS building

    MATCH (building)<-[:\`hg:liesIn\`|\`=\`|\`=i\` * 1 .. 8]-(p:\`st:Person\`)
    RETURN DISTINCT p.data;
  `

  var params = {
    buildingId: `urn:hgid:${req.query.id}`
  }

  neo4j.query(query, params, function(err, results) {
    if (err) {
      res.status(500).send({error: err.message})
    } else {
      res.send(results.map((r) => JSON.parse(r['p.data'])))
    }
  })
})

app.get('/search', function (req, res) {
  var params = {}

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

  if (req.query.contains) {
    var rect = req.query.contains.split(',').map(function (c) {
      return parseFloat(c)
    })

    params.contains = [
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

  if (req.query.intersects) {
    var rect = req.query.intersects.split(',').map(function (c) {
      return parseFloat(c)
    })

    params.intersects = [
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


  elasticsearch.search(params, function (err, data) {
    if (err) {
      res.send(err)
    } else {
      res.send({
        type: 'FeatureCollection',
        features: data.map((pit) => {
          var properties = {
            id: pit.id,
            dataset: pit.dataset,
            name: pit.name,
            type: pit.type,
            validSince: pit.validSince,
            validUntil: pit.validUntil,
            data: pit.data
          }

          return {
            type: 'Feature',
            properties: idOrUri(properties),
            geometry: pit.geometry
          }
        })
      })
    }
  })
})

app.listen(port, function () {
  console.log('PITs API listening on port ' + port)
})
