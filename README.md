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

| Name                 | Required | Description                                                                                                        |
|----------------------|----------|--------------------------------------------------------------------------------------------------------------------|
| `DOCKER_CONFIG_PATH` | no       | Absolute path to your docker-config file to allow access to authenticated AWS ECR endpoints to pull private images | 
| `CHT_COMPOSE_PATH`   | yes      | Absolute path to the folder where the CHT docker-compose file is saved                                             | 
| `COUCHDB_USER`       | yes      | CouchDb main admin account username                                                                                |
| `COUCHDB_PASSWORD`   | yes      | CouchDb main admin account password                                                                                | 
| `COUCHDB_SECRET`     | no       | CouchDb secret                                                                                                     |  
| `COUCHDB_UUID`       | no | The uuid of the CouchDb Server                                                                                     |
| `API_PORT`           | no | Defaults to 5988. The port on which CHT-Api is available on the network.                                           | 
| `MARKET_URL_READ`    | no | Defaults to `https://staging.dev.medicmobile.org`. Points to the source of the CHT-Core staging server.            |                                                                |                                                                 |
| `BUILDS_SERVER`      | no | Defaults to `_couch/builds`. Points to the source of the CHT-Core staging server database.                         | 

#### Run
```shell
docker-compose up -f <path to upgrade service docker-compose yml file> -d
```



