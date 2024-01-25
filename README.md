CHT Upgrade Service
========================

The CHT Upgrade Service provides an interface between CHT-Core API and Docker to allow easy startup and one-click upgrades from the CHT-Core Admin UI. 

## Requirements

* Docker
* docker-compose

### Directories 

To use the CHT Upgrade service, you need to have three directories:
1. CHT Core & CouchDB compose files
2. CouchDB database 
3. Upgrade Service 

## Example Usage

Assuming you wanted to create a new project called `cht-4-first-run` in your user `me`'s home directory, and you want to use the least amount of env vars,  you would follow these steps below. It will create a self signed cert, use port `80` and port `443`. If you're doing a lot of testing, you might want to ensure no other docker containers are running with `docker kill $(docker ps  -q)`. Then follow these steps:

1. Create a directory to house your CHT Core and CouchDB compose files. You need a unique pair of these per project you run.  We'll use `cht-4-first-run`: 
    ```
    mkdir -p ~/cht-4-first-run/compose
    cd ~/cht-4-first-run
    ```
1. Download CHT Core, CouchDB and Upgrade Service compose files into the new directory you just created: 
    ```
    cd ~/cht-4-first-run
    curl -s -o ./compose/cht-couchdb.yml https://staging.dev.medicmobile.org/_couch/builds_4/medic:medic:master/docker-compose/cht-couchdb.yml
    curl -s -o ./compose/cht-core.yml https://staging.dev.medicmobile.org/_couch/builds_4/medic:medic:master/docker-compose/cht-core.yml
    curl -s -o docker-compose.yml https://raw.githubusercontent.com/medic/cht-upgrade-service/main/docker-compose.yml
    ```
1. Create a file in `~/cht-4-first-run` to house your variables.  Call it `.env` and give it the following contents (Note these are insecure password - use **secure** password for production!). Note if you're trying to run this locally that you replace `/home/me` with your actual home dir path:
   ```
   CHT_COMPOSE_PROJECT_NAME=4-first-run
   COUCHDB_SECRET=password
   DOCKER_CONFIG_PATH=/home/me/cht-4-first-run/compose
   COUCHDB_DATA=/home/me/cht-4-first-run/couchd
   CHT_COMPOSE_PATH=/home/me/cht-4-first-run/compose
   COUCHDB_USER=medic
   COUCHDB_PASSWORD=password
   ```
1. Call `up` with docker:
   ```
   cd ~/cht-4-first-run
   docker compose up
   ```
 1. Your instance should now be available at [localhost](https://localhost) with login `medic` and password `password`.  You will need to accept the self signed certificate the first time you access the instance. 

## Environment Variables

This is a list of all variables that can be used:

| Name                       | Required | Description                                                                                                                                                                                                                                                                               | Example                                                                              |
|----------------------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| `CHT_COMPOSE_PATH`         | yes      | Absolute path to the folder where the two CHT docker-compose files are saved.                                                                                                                                                                                                             | `/home/cht`                                                                          |
| `COUCHDB_USER`             | yes      | CouchDB main admin account username.                                                                                                                                                                                                                                                      | `admin`                                                                              |
| `COUCHDB_PASSWORD`         | yes      | CouchDB main admin account password.                                                                                                                                                                                                                                                      | `thump-quake-agony-kite-civil-surf-mama`                                             |
| `COUCHDB_SECRET`           | yes      | CouchDB secret used by peers to communicate and to generate authentication cookies. Mandatory for CouchDB clustered mode to synchronize authentication cookie between nodes.                                                                                                              | `kung-botch-pants-niece-lady-quill-elbow`                                            |
| `DOCKER_CONFIG_PATH`       | yes      | Absolute path to your docker-config file to allow access to authenticated AWS ECR endpoints to pull private images. Omitting this value will only allow pulling from public Docker registries.                                                                                            | `/home/cht/aws_conf`                                                                 |
| `COUCHDB_UUID`             | no       | The UUID of the CouchDB Server used in [identifying the cluster when replicating](https://docs.couchdb.com/en/stable/setup/cluster.html#preparing-couchdb-nodes-to-be-joined-into-a-cluster)                                                                                              | `60c9e8234dfba3e2fdab04bf92001142`                                                   |
| `COUCHDB_DATA`             | yes      | Absolute path to the folder that will serve as CouchDB data location.                                                                                                                                                                                                                     | `/home/cht/srv`                                                                      |
| `COUCHDB_SERVERS`          | no       | Comma separated list of all CouchDB services. Defaults to `couchdb`.                                                                                                                                                                                                                      | Single Node:`couchdb`<br/> Cluster:`couchdb-1.local,couchdb-2.local,couchdb-3.local` |
| `CLUSTER_PEER_IPS`         | no       | Comma separated list of all secondary CouchDB services. Only used when clustering.                                                                                                                                                                                                        | Cluster:`couchdb-2.local,couchdb-3.local`                                            |
| `SVC_NAME`                 | no       | Single node CouchDb service name. Defaults to `couchdb`.                                                                                                                                                                                                                                  | Single Node:`couchdb`                                                                |
| `SVC1_NAME`                | no       | Main CouchDb node service name. Defaults to `couchdb-1.local`. Only used when clustering.                                                                                                                                                                                                 | Cluster:`couchdb-1.local`                                                            |
| `SVC2_NAME`                | no       | Secondary CouchDb node service name. Defaults to `couchdb-2.local`. Only used when clustering.                                                                                                                                                                                            | Cluster:`couchdb-2.local`                                                            |
| `SVC3_NAME`                | no       | Secondary CouchDb node service name. Defaults to `couchdb-3.local`. Only used when clustering.                                                                                                                                                                                            | Cluster:`couchdb-3.local`                                                            |
| `COUCHDB_LOG_LEVEL`        | no       | Selects verbosity of CouchDb logging. Defaults to `error`.                                                                                                                                                                                                                                | `error`                                                                              |
| `MARKET_URL_READ`          | no       | URL for the CHT Core to check for and retrieve updates. Defaults to `https://staging.dev.medicmobile.org`                                                                                                                                                                                 | `https://staging.dev.medicmobile.org`                                                |
| `BUILDS_SERVER`            | no       | Path for the CHT Core to check for and retrieve updates. Appended to `MARKET_URL_READ`. Defaults to `_couch/builds`.                                                                                                                                                                      | `_couch/builds`                                                                      |
| `NGINX_HTTP_PORT`          | no       | The port on which CHT-API is available on the host network. Defaults to `80`.                                                                                                                                                                                                             | `80`                                                                                 |
| `NGINX_HTTPS_PORT`         | no       | The secure port on which CHT-API is available on the host network. Defaults to `443`.                                                                                                                                                                                                     | `443`                                                                                |
| `CERTIFICATE_MODE`         | no       | SSL certificate mode. `OWN_CERT` instructs to use existent certificate. Other options are `AUTO_GENERATE`, which generates a new certificate with Let's Encrypt's [Certbot](https://certbot.eff.org/), or `SELF_SIGNED` which generates a self signed certificate. Defaults to `SELF_SIGNED` | `SELF_SIGNED`                                                                           |
| `SSL_VOLUME_MOUNT_PATH`    | no       | Volume path that hosts SSL certificates. Used when `CERTIFICATE_MODE` is `OWN_CERT`.                                                                                                                                                                                                      | `/home/cht/certs`                                                                    |
| `SSL_CERT_FILE_PATH`       | no       | Path to the existent SSL Certificate. Required and used when `CERTIFICATE_MODE` is `OWN_CERT`                                                                                                                                                                                             | `/home/cht/certs/cert.pem`                                                           |
| `SSL_KEY_FILE_PATH`        | no       | Path to the existent SSL Certificate Key. Required and used when `CERTIFICATE_MODE` is `OWN_CERT`                                                                                                                                                                                         | `/home/cht/certs/key.pem`                                                            |
| `COMMON_NAME`              | no       | The domain name of the instance that the SSL certificate is for. Required when `CERTIFICATE_MODE` is `AUTO_GENERATE` or `SELF_SIGNED`.                                                                                                                                                    | `example.app.medic.org`                                                              |
| `EMAIL`                    | no       | SSL Certificate registration email. Required when `CERTIFICATE_MODE` is `AUTO_GENERATE` or `SELF_SIGNED`.                                                                                                                                                                                 | `/home/cht/certs/key.pem`                                                            |
| `COUNTRY`                  | no       | SSL Certificate registration country. Used when `CERTIFICATE_MODE` is `AUTO_GENERATE` or `SELF_SIGNED`.                                                                                                                                                                                   | `US`                                                                                 |
| `STATE`                    | no       | SSL Certificate registration state. Used when `CERTIFICATE_MODE` is `AUTO_GENERATE` or `SELF_SIGNED`.                                                                                                                                                                                     | `CO`                                                                                 |
| `LOCALITY`                 | no       | SSL Certificate registration locality. Used when `CERTIFICATE_MODE` is `AUTO_GENERATE` or `SELF_SIGNED`.                                                                                                                                                                                  | `Denver`                                                                             |
| `ORGANISATION`             | no       | SSL Certificate registration organization. Used when `CERTIFICATE_MODE` is `AUTO_GENERATE` or `SELF_SIGNED`.                                                                                                                                                                              | `Medic`                                                                              |
| `DEPARTMENT`               | no       | SSL Certificate registration department. Used when `CERTIFICATE_MODE` is `AUTO_GENERATE` or `SELF_SIGNED`.                                                                                                                                                                                | `Department of Information Security`                                                 |
| `CHT_COMPOSE_PROJECT_NAME` | no       | docker-compose project name to use for CHT-Core. Defaults to `cht`                                                                                                                                                                                                                        | `cht-dev-4-alpha`                                                                    |
| `CHT_NETWORK`              | no       | docker network to use for cht-core and cht-upgrade-service. Defaults to `cht-net`                                                                                                                                                                                                         | `cht-dev-4-alpha-net`                                                                |
| `CHT_BACKUP_COMPOSE_FILES` | no       | Whether to backup yml files before overwriting. Can be `true` or `false` (default `true`).                                                                                                                                                                                                | `false`                                                                              |
| `HEALTHCHECK_LOG_LEVEL`    | no       | Log level of haproxy-healthcheck service. Defaults to `WARNING`                                                                                                                                                                                                                              | `DEBUG`, `INFO`, `WARNING`, or `ERROR`                                               |




## API

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

