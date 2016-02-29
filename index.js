var express = require('express')
// var pitsToGeoJSON = require('pits-to-geojson')
var io = require('histograph-io')
var elasticsearch = require('histograph-db-elasticsearch')
var app = express()

// Mount Histograph IO
app.use('/', io)

var port = 3001

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

app.get('/', function (req, res) {
  res.send({
    title: 'Space/Time Directory API'
  })
})

app.get('/search', function (req, res) {
  var params = {}

  if (req.query.dataset) {
    params.dataset = req.query.dataset.split(',')
  }

  if (req.query.type) {
    params.type = req.query.type.split(',')
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

  elasticsearch.search(params, function (err, data) {
    if (err) {
      res.send(err)
    } else {
      res.send({
        type: 'FeatureCollection',
        features: data.map((pit) => {
          var properties = {
            dataset: pit.dataset,
            name: pit.name,
            type: pit.type,
            data: pit.data
          }

          if (pit.uri) {
            properties.uri = pit.uri
          }

          if (pit.id) {
            properties.id = pit.dataset + '/' + pit.id
          }

          return {
            type: 'Feature',
            properties: properties,
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
