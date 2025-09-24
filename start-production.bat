@echo off
setlocal ENABLEEXTENSIONS

REM UTF-8 in der Konsole
chcp 65001 >NUL

echo 🚀 Starting Alpaca Safety Monitor Bridge in production mode...

REM Production-Env setzen
set NODE_ENV=production

REM Standardport setzen falls leer
if not defined WEB_PORT set WEB_PORT=3000

echo 📦 Building frontend...

REM Prüfen ob run-p verfügbar ist
where run-p >NUL 2>&1
if %ERRORLEVEL%==0 (
    echo ▶ Using run-p for parallel build
    call npm run build
) else (
    echo ⚠ run-p not found, falling back to sequential build...
    call npm run type-check
    if errorlevel 1 (
        echo ❌ Type-check failed!
        exit /b 1
    )
    call npm run build-only
    if errorlevel 1 (
        echo ❌ Frontend build failed!
        exit /b 1
    )
)

echo ✅ Frontend build completed
echo 🌐 Web interface: http://localhost:%WEB_PORT%
echo 🔧 Alpaca API:    11111 (TCP)
echo 📡 Discovery:     32227 (UDP)

echo 🔥 Starting production server...
node wrapper-server.cjs

endlocal
