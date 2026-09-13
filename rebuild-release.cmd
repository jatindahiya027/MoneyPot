@echo off
setlocal
cd /d "%~dp0"

echo Cleaning the current release folder and creating all MoneyPot platform builds...
call npm run release:rebuild
set "BUILD_EXIT_CODE=%ERRORLEVEL%"

if not "%BUILD_EXIT_CODE%"=="0" (
  echo.
  echo MoneyPot release build failed with exit code %BUILD_EXIT_CODE%.
) else (
  echo.
  echo MoneyPot release build completed successfully.
)

exit /b %BUILD_EXIT_CODE%
