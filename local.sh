#!/bin/sh
export NODE_ENV="dev"
export MONGODB_URL="mongodb://127.0.0.1"
export MONGODB_NAME="beamchat"
export COLLECTION_CHATS="chats"
export COLLECTION_USERS="users"
export COLLECTION_MESSAGES="messages"
export HOST="localhost"
export PORT=3501
export NAME="beamchat"
export VERSION=1
export NODE_OPTIONS=--openssl-legacy-provider
export BEAMCHAT_SIGN=secr4tSignJWT7B3am4rCh2t
nodemon ./index
# node app.js