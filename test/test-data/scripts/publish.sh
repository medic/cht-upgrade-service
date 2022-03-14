#!/usr/bin/env bash

set -e

main()
{
  basedir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
  cd $basedir
  cd ../services

  build_version "1.0.0" "one"
  build_version "1.0.0" "two"
  build_version "1.0.0" "three"

  build_version "2.0.0" "one"
  build_version "2.0.0" "two"
  build_version "2.0.0" "three"

  build_version "3.0.0" "one"
  build_version "3.0.0" "two"
  build_version "3.0.0" "three"
}

build_version()
{
  local version="$1"
  local service="$2"

  cd ./$service
  npm version --no-git-tag-version --allow-same-version $version
  docker build . --tag upgrade/$service:$version
  docker image tag upgrade/$service:$version localhost:5000/upgrade/$service:$version
  docker image push localhost:5000/upgrade/$service:$version
  cd ../
}

mkdir -p "../docker-compose"
main
