#!/usr/bin/env bash
docker stop registry
docker rm registry
docker run -d -p 5000:5000 --name registry registry:2
