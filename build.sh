#!/bin/bash
set +e
node -v
npm -v
sudo find / -iname nvm 2>/dev/null
nvm --version || true
set -e
###################################
###################################
KIBANA_VERSION=5.3.0
PLUGIN_VERSION=$KIBANA_VERSION-2
PLUGIN_NAME=searchguard-kibana
###################################
###################################
KIBANA_NODE_JS_VERSION_URL="https://raw.githubusercontent.com/elastic/kibana/v$KIBANA_VERSION/.node-version"
echo "Building $PLUGIN_NAME-$PLUGIN_VERSION.zip"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"
NODEVERSION="$(curl -s $KIBANA_NODE_JS_VERSION_URL)"
echo "Nodejs version: $NODEVERSION"
nvm install "$NODEVERSION"
rm -rf build/
rm -rf node_modules/
#npm install --save hapi@16.0.1
npm install
COPYPATH="build/kibana/$PLUGIN_NAME"
mkdir -p $COPYPATH
cp -a index.js $COPYPATH
cp -a package.json $COPYPATH
cp -a lib $COPYPATH
cp -a node_modules $COPYPATH
cp -a public $COPYPATH
#cp -a server $COPYPATH
cd build
zip --quiet -r $PLUGIN_NAME-$PLUGIN_VERSION.zip kibana
ls -lah $PLUGIN_NAME-$PLUGIN_VERSION.zip
cd $DIR
mkdir -p releases/$PLUGIN_VERSION/
cp build/$PLUGIN_NAME-$PLUGIN_VERSION.zip releases/$PLUGIN_VERSION/
echo "Created releases/$PLUGIN_VERSION/$PLUGIN_NAME-$PLUGIN_VERSION.zip"
SHA256="$(sha256sum build/$PLUGIN_NAME-$PLUGIN_VERSION.zip)"
echo "SHA256: $SHA256"