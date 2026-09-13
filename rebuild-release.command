#!/bin/zsh

cd -- "$(dirname -- "$0")" || exit 1

echo "Cleaning the current release folder and creating all MoneyPot platform builds..."
npm run release:rebuild
BUILD_EXIT_CODE=$?

echo
if [[ $BUILD_EXIT_CODE -eq 0 ]]; then
  echo "MoneyPot release build completed successfully."
else
  echo "MoneyPot release build failed with exit code $BUILD_EXIT_CODE."
fi

if [[ -t 0 ]]; then
  echo
  read "REPLY?Press Enter to close..."
fi

exit $BUILD_EXIT_CODE
