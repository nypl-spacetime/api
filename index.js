const express = require('express')
// var logs = require('spacetime-logs-api')
const elasticsearch = require('spacetime-db-elasticsearch')

const cors = require('cors')
const app = express()

// app.use('/logs', logs)

app.use(cors())

var port = process.env.PORT || 3001

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

app.get('/', (req, res) => {
  res.send({
    title: 'NYC Space/Time Directory API'
  })
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

  if (req.query.contains) {
    let rect = req.query.contains.split(',').map(function (c) {
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
    let rect = req.query.intersects.split(',').map(function (c) {
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

  elasticsearch.search(params, (err, data) => {
    if (err) {
      res.send(err)
    } else {
      res.send({
        type: 'FeatureCollection',
        features: data.map((object) => ({
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
        }))
      })
    }
  })
})

app.listen(port, () => {
  console.log('NYC Space/Time Directory API listening on port ' + port)
})
