#!/usr/bin/env bash
set -e

GIT_COMMIT=$(git rev-parse --short HEAD)
GIT_DATE=$(git log -1 --format="%Y-%m-%dT%H:%M:%SZ" --date=iso-strict)

echo "Deploying mercury-worker @ $GIT_COMMIT ($GIT_DATE)"

npx wrangler deploy \
  --var GIT_COMMIT:"$GIT_COMMIT" \
  --var GIT_DATE:"$GIT_DATE"
