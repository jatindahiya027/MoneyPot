#!/bin/zsh
set -e

cd "$(dirname "$0")"

if [ ! -f ".next/BUILD_ID" ]; then
  echo "Build not found. Running npm run build..."
  npm run build
fi

echo "Starting app..."
npm start
