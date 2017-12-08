# NYC Space/Time Directory API

NYC Space/Time Directory Elastic Search API powered by AWS Lambda, Serverless and Express

## Version
> v0.0.1

## Supported Endpoints
|Route   	|Example   	|Description   	|
|---	|---	|---	|
|`/datasets/:datasetId/objects/:objectId`|`/datasets/addresses/objects/104981-1`|Query Search for all datasets with given :datasetId and :objectId|
|`/search`|`/search?name=53 Crosby Street`|Query Search for all name property matches|
||`/search?since=1900&until=1910`|Query Search for a range of dates|
||`/search?geometry=-73.99136982858165,40.72543088866333,-73.99136982858165,40.72543088866333`|Query Search by bounding box of 4 geo-coordinates (longitude, latitude)|

## AWS Configuration
Prior to deployment, you must ensure your AWS_PROFILE is set as an environment variable in your Lambda AWS Console Configuration page.

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
