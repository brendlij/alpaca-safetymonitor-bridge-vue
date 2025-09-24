@echo off
setlocal ENABLEEXTENSIONS

REM Optional: UTF-8 in der Konsole
chcp 65001 >NUL

echo Starting Alpaca Safety Monitor Bridge in production mode...

REM Production env
set "NODE_ENV=production"

REM Default port
if not defined WEB_PORT set "WEB_PORT=3000"

echo Building frontend...

REM Check if run-p exists; otherwise fall back to sequential build
where run-p >NUL 2>&1
if %ERRORLEVEL%==0 (
  call npm run build
) else (
  echo run-p not found, using sequential build...
  call npm run type-check || (echo Type-check failed! & exit /b 1)
  call npm run build-only || (echo Frontend build failed! & exit /b 1)
)

echo Frontend build completed
echo Web interface: http://localhost:%WEB_PORT%
echo Alpaca API:    11111 (TCP)
echo Discovery:     32227 (UDP)

echo Starting production server...
node wrapper-server.cjs

endlocal
