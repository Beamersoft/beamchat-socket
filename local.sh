#!/bin/sh
export NODE_ENV="dev"
export MONGODB_URL="mongodb://127.0.0.1"
export MONGODB_NAME="beamchat"
export HOST="localhost"
export PORT=3500
export NAME="beamchat"
export VERSION=1
export NODE_OPTIONS=--openssl-legacy-provider
nodemon .
# node app.js