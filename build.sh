#!/bin/bash
PLUGIN_NAME=searchguard-kibana
PLUGIN_VERSION=5.3.0-2
KIBANA_VERSION=5.3.0
KIBANA_NODE_JS_VERSION_URL="https://raw.githubusercontent.com/elastic/kibana/v$KIBANA_VERSION/.node-version"
echo "Building $PLUGIN_NAME-$PLUGIN_VERSION.zip"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"
#cd $DIR/..
#git clone https://github.com/elastic/kibana.git
#cd "kibana"
#git fetch
#git checkout tags/v$KIBANA_VERSION
#hash nvm 2>/dev/null || export NVM_DIR=~/.nvm; mkdir -p $NVM_DIR; . $(brew --prefix nvm)/nvm.sh

echo "Nodejs $(curl -s $KIBANA_NODE_JS_VERSION_URL)"
nvm install "$(curl -s $KIBANA_NODE_JS_VERSION_URL)"


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
md5sum build/$PLUGIN_NAME-$PLUGIN_VERSION.zip

echo "Uploading build/$PLUGIN_NAME-$PLUGIN_VERSION.zip"
cresponse=$(curl --write-out %{http_code} --silent --output uploadresult -X POST -F fileUpload=@build/$PLUGIN_NAME-$PLUGIN_VERSION.zip 'https://www.filestackapi.com/api/store/S3?key=Aa30JUUJZQ4i5UPcU5BUHz')
response="$(echo "$cresponse" | cut -c1-3)"

if ! [[ $response == "200" ]] ; then
   echo "Upload failed with status $response"
   exit 1
fi

echo "Upload response: $response"
echo "Result upload ############"
cat uploadresult
echo "##########################"
