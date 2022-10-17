CHT Upgrade Service
========================

The CHT Upgrade Service provides an interface between CHT-Core API and Docker to allow easy startup and one-click upgrades from the CHT-Core Admin UI. 

# Requirements

* Docker
* docker-compose

# Installation and usage

Installation and usage is achieved entirely with docker-compose. 

#### Download and save CHT-Core docker-compose yml file. 

##### Todo improve steps
The docker-compose yml files are attached to the staging document for each branch. After downloading, create a folder on your computer and save both in the same folder.

#### Download and save CHT upgrade service docker-compose yml file.

##### Todo improve steps

Save this file in a new folder on your computer - a different folder than the one you're keeping the CHT docker-compose files.

#### Export the environment variables:

| Name            | Required | Description                                                                                                                                                                                                                                  |
|-----------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `CHT_COMPOSE_PATH` | yes      | Absolute path to the folder where the two CHT docker-compose files are saved.                                                                                                                                                                      | 
| `COUCHDB_USER`  | yes      | CouchDB main admin account username.                                                                                                                                                                                                         |
| `COUCHDB_PASSWORD` | yes      | CouchDB main admin account password.                                                                                                                                                                                                         | 
| `COUCHDB_SECRET` | yes      |  CouchDB secret used by peers to communicate and to generate authentication cookies.  Mandatory for CouchDB clustered mode to synchronize authentication cookie between nodes. |
| `COUCHDB_UUID`  | no       | The UUID of the CouchDB Server used in [identifying the cluster when replicating](https://docs.couchdb.com/en/stable/setup/cluster.html#preparing-couchdb-nodes-to-be-joined-into-a-cluster)  |
| `COUCHDB_DATA`  | yes      | Absolute path to the folder that will serve as CouchDB data location.                                                                                                                                                                        |
| `COUCHDB_SERVERS`          | no       | Comma separated list of all CouchDB services. Defaults to `couchdb`.                                                                                                                                                                         |
| `MARKET_URL_READ` | no       | URL for the CHT Core to check for and retrieve updates. Defaults to `https://staging.dev.medicmobile.org`                                                                                                                                      |                                                                |                                                                 |
| `BUILDS_SERVER` | no       | Path for the CHT Core to check for and retrieve updates. Appended to `MARKET_URL_READ`. Defaults to `_couch/builds`. |
| `NGINX_HTTP_PORT`      | no       | The port on which CHT-API is available on the host network. Defaults to `80`. |
| `NGINX_HTTPS_PORT`      | no       | The secure port on which CHT-API is available on the host network. Defaults to `443`. |
| `CERTIFICATE_MODE` | no      | SSL certificate mode.  `OWN_CERT` instructs to use existent certificate. Other options are `AUTO_GENERATE`, which generates a new certificate with Let's Encrypt's [Certbot](https://certbot.eff.org/), or `SELF_SIGNED` which generates a self signed certificate.  Defaults to `OWN_CERT`  |
| `SSL_VOLUME_MOUNT_PATH`    | no       | Volume path that hosts SSL certificates. Used when `CERTIFICATE_MODE` is `OWN_CERT`.                                                                                                                                                         |
| `SSL_CERT_FILE_PATH` | no       | Path to the existent SSL Certificate. Required and used when `CERTIFICATE_MODE` is `OWN_CERT`                                                                                                                                                |
| `SSL_KEY_FILE_PATH` | no       | Path to the existent SSL Certificate Key. Required and used when `CERTIFICATE_MODE` is `OWN_CERT`                                                                                                                                            |
| `COMMON_NAME`   | no       | The domain name of the instance that the SSL certificate is for. Required when `CERTIFICATE_MODE` is `AUTO_GENERATE` or `SELF_SIGNED`.                                                                                                       |  
| `EMAIL`     | no       | SSL Certificate registration email. Required when `CERTIFICATE_MODE` is `AUTO_GENERATE` or `SELF_SIGNED`.                                                                                                                                    | 
| `COUNTRY` | no       | SSL Certificate registration country. Used when `CERTIFICATE_MODE` is `AUTO_GENERATE` or `SELF_SIGNED`.                                                                                                                                      | 
| `STATE` | no       | SSL Certificate registration state. Used when `CERTIFICATE_MODE` is `AUTO_GENERATE` or `SELF_SIGNED`.                                                                                                                                        |
| `LOCALITY` | no       | SSL Certificate registration locality. Used when `CERTIFICATE_MODE` is `AUTO_GENERATE` or `SELF_SIGNED`.                                                                                                                                     |
| `ORGANISATION` | no       | SSL Certificate registration organization. Used when `CERTIFICATE_MODE` is `AUTO_GENERATE` or `SELF_SIGNED`.                                                                                                                                 |\
| `DEPARTMENT` | no       | SSL Certificate registration department. Used when `CERTIFICATE_MODE` is `AUTO_GENERATE` or `SELF_SIGNED`.                                                                                                                                   |
| `CHT_COMPOSE_PROJECT_NAME` | no       | docker-compose project name to use for CHT-Core. Defaults to `cht`                                                                                                                                                                           | 
| `CHT_NETWORK`              | no       | docker network to use for cht-core and cht-upgrade-service. Defaults to `cht-net`                                                                                                                                                            |
| `DOCKER_CONFIG_PATH` | no       | Absolute path to your docker-config file to allow access to authenticated AWS ECR endpoints to pull private images. Omitting this value will only allow pulling from public Docker registries.                                               |


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
  "<non_existent_file>": { "ok": false, "reason": "Existing installation not found. Use '/install' API to install." }
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
  "<existent_file>": { "ok": false, "reason": "Existing installation found. Use '/upgrade' API to upgrade." },
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
