#!/usr/bin/env bash

DEPLOY_PATH_ROOT=direct-relief/show/
DEPLOY_PATH=direct-relief/show/latest
BRANCH=$(git branch | sed -n -e 's/^\* \(.*\)/\1/p')

while getopts 'bds:' OPTION; do
  case "$OPTION" in
    b)
      DEPLOY_PATH=$DEPLOY_PATH_ROOT$BRANCH
      ;;
    s)
      DEPLOY_PATH=$DEPLOY_PATH_ROOT$OPTARG
      ;;
    d)
      DEPLOY_PATH=$DEPLOY_PATH_ROOT`date +%Y-%m-%d`
      ;;
    ?)
      echo "script usage: $(basename \$0) [-b] [-d] [-s customsuffix]" >&2
      exit 1
      ;;
  esac
done

echo "Building app"
NODE_ENV=production npm run build

echo "Deploying to http://studio.stamen.com/$DEPLOY_PATH"
rsync -rv dist/ deploy@studio.stamen.com:~/www/$DEPLOY_PATH