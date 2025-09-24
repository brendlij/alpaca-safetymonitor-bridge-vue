@echo off
setlocal ENABLEEXTENSIONS
chcp 65001 >NUL

echo Starting Alpaca Safety Monitor Bridge in production mode...

set "NODE_ENV=production"
if not defined WEB_PORT set "WEB_PORT=3000"

REM --- Ensure dev deps (vue-tsc/vite) are present ---
if not exist "node_modules\.bin\vue-tsc.cmd" (
  echo Dev dependencies not found. Installing...
  call npm config set production false
  call npm install
  if errorlevel 1 ( echo npm install failed & exit /b 1 )
)

echo Building frontend...

REM Try run-p, else do sequential
where run-p >NUL 2>&1
if %ERRORLEVEL%==0 (
  call npm run build
  if errorlevel 1 ( echo Frontend build failed! & exit /b 1 )
) else (
  echo run-p not found, using sequential build...
  call npx --yes vue-tsc --build || ( echo Type-check failed! & exit /b 1 )
  call npx --yes vite build || ( echo Frontend build failed! & exit /b 1 )
)

echo Frontend build completed
echo Web interface: http://localhost:%WEB_PORT%
echo Alpaca API:    11111 (TCP)
echo Discovery:     32227 (UDP)

echo Starting production server...
node wrapper-server.cjs

endlocal
