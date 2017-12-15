# NYC Space/Time Directory API

Search API powered by AWS Lambda and AWS Elasticsearch, Serverless and Express, for data from [NYC Space/Time Directory](http://spacetime.nypl.org).

## Supported Endpoints

### Single Object

- Endpoint: `/datasets/:datasetId/objects/:objectId`
- Description: fetch single Object with given `:datasetId` and `:objectId`
- Example: `/datasets/addresses/objects/104981-1`

### Search

- Endpoint: `/search`
- Description: search Objects by name, date, type or geometry
- Example: `/search?geometry=-73.9913698,40.7254308,-73.9913698,40.7254308&name=broadway&since=1900`
- Parameters:
  - `name`: Name of Object, or part of name
  - `geometry`: coordinates of bounding box Object is contained by or intersects, in form `north,west,south,east`
  - `types`: comma-separated list of [types](https://github.com/nypl-spacetime/spacetime-config/blob/master/spacetime.default.yml#L26), e.g. `st:Building,st:Address`
  - `since`: Object must be younger than this year
  - `until`: Object must be older than this year

## AWS Configuration

Prior to deployment, you must ensure your `AWS_PROFILE` is set as an environment variable in your Lambda AWS Console Configuration page.

## Development

### Install Dependencies

```sh
$ npm install -g serverless // Install serverless globally
$ npm install
```

### Offline API Mode

```sh
$ sls offline start
```

### Deploy to AWS Lambda

```sh
$ sls deploy
```

## See also:

- http://spacetime.nypl.org/architecture
- https://github.com/nypl-spacetime/documentation
