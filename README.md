CHT Upgrade Service
========================

The CHT Upgrade Service provides an interface between CHT-Core API and Docker to allow easy startup and one-click upgrades from the CHT-Core Admin UI. 

# Requirements

* Docker
* docker-compose

# Installation and usage

Installation and usage is achieved entirely with docker-compose. 

#### Download and save CHT-Core docker-compose yml file. 

Todo steps??

#### Download and save CHT upgrade service docker-compose yml file.

Todo steps??

#### Export the environment variables:

| Name                 | Required | Description                                                                                                                                                                                                                                  |
|----------------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `CHT_COMPOSE_PATH`   | yes      | Absolute path to the folder where the CHT docker-compose file is saved.                                                                                                                                                                      | 
| `COUCHDB_USER`       | yes      | CouchDb main admin account username.                                                                                                                                                                                                         |
| `COUCHDB_PASSWORD`   | yes      | CouchDb main admin account password.                                                                                                                                                                                                         | 
| `COUCHDB_SECRET`     | yes      | Secret that is used by the CouchDB peers to communicate with each other and to generate authentication cookies. This field is mandatory if you are running CouchDb clustered mode to make the same authentication cookie valid on all nodes. |  
| `DOCKER_CONFIG_PATH` | no       | Absolute path to your docker-config file to allow access to authenticated AWS ECR endpoints to pull private images. Omitting this value will only allow pulling from public Docker registries.                                               |
| `COUCHDB_UUID`       | no       | The uuid of the CouchDb Server                                                                                                                                                                                                               |
| `API_PORT`           | no       | Defaults to 5988. The port on which CHT-Api is available on the network.                                                                                                                                                                     | 
| `MARKET_URL_READ`    | no       | Defaults to `https://staging.dev.medicmobile.org`. Points to the source of the CHT-Core staging server.                                                                                                                                      |                                                                |                                                                 |
| `BUILDS_SERVER`      | no       | Defaults to `_couch/builds`. Points to the source of the CHT-Core staging server database.                                                                                                                                                   | 

#### Run
```shell
docker-compose up -f <path to upgrade service docker-compose yml file> -d
```

# API

The API is only available on the `cht-net` docker network, and listens to port `5008`. 

### GET / 

Expected response:
```HTTP/1.1 200```
```json
{ "ok": true }
```


### POST /upgrade

Accepts a payload that contains pairs of docker-compose file names and contents. It

- overwrites the files with the corresponding name in the `CHT_COMPOSE_PATH` folder
- validates the contents of each file before overwriting
- does not create new files, if a matching file does not already exist in `CHT_COMPOSE_PATH` folder, writing is skipped
- pulls docker images from every updated file (`docker-compose pull -f <file>`)
- when all files have been processed, executes a `docker-compose up` over all files in the folder, restarting the containers that have new images.

Request body:
```Accepts: application/json```
```json
{
  "docker_compose": {
    "<file_name1>": "<file contents>",
    "<file_name2>": "<file contents>"
  }
}
```

Expected successful response:
```HTTP/1.1 200```
```json
{
  "<file_name1>": { "ok": true },
  "<file_name2>": { "ok": true }
}
```

Expected successful response when a file is skipped:
```HTTP/1.1 200```
```json
{
  "<existent_file>": { "ok": true },
  "<non_existent_file>": { "ok": false }
}
```

Expected error response:
```HTTP/1.1 500```
```json
{
  "error": true,
  "reason": "<error details>"
}
```

### POST /install

Accepts a payload that contains pairs of docker-compose file names and contents. It

- creates the files with the corresponding name in the `CHT_COMPOSE_PATH` folder
- validates the contents of each file before creation
- does not overwrite existing files, if a matching file already exists in `CHT_COMPOSE_PATH` folder, writing is skipped
- pulls docker images from every updated file (`docker-compose pull -f <file>`)
- when all files have been processed, does a `docker-compose up` over all files in the folder, which start the new containers. 

Request body:
```Accepts: application/json```
```json
{
  "docker_compose": {
    "<file_name1>": "<file contents>",
    "<file_name2>": "<file contents>"
  }
}
```

Expected successful response:
```HTTP/1.1 200```
```json
{
  "<file_name1>": { "ok": true },
  "<file_name2>": { "ok": true }
}
```

Expected successful response when a file is skipped:
```HTTP/1.1 200```
```json
{
  "<existent_file>": { "ok": false },
  "<non_existent_file>": { "ok": true }
}
```

Expected error response:
```HTTP/1.1 500```
```json
{
  "error": true,
  "reason": "<error details>"
}
```

### POST /start

Starts all containers from all valid docker compose files in the `CHT_COMPOSE_PATH` folder. 

Expected response:
```HTTP/1.1 200```
```json
{ "ok": true }
```
