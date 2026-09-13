@echo off
cd /d "%~dp0"

if not exist ".next\BUILD_ID" (
  echo Build not found. Running npm run build...
  call npm run build
  if errorlevel 1 pause & exit /b %errorlevel%
)

echo Starting app...
call npm start
pause
