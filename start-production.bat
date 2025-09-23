@echo off
REM Production start script for Alpaca Safety Monitor Bridge (Windows)
REM This script builds the frontend and starts the production server

echo 🚀 Starting Alpaca Safety Monitor Bridge in production mode...

REM Set production environment
set NODE_ENV=production

REM Use environment variables or defaults
if not defined WEB_PORT set WEB_PORT=3000

echo 📦 Building frontend...
call npm run build

if %ERRORLEVEL% neq 0 (
    echo ❌ Frontend build failed!
    exit /b 1
)

echo ✅ Frontend build completed
echo 🌐 Web interface will be available on port %WEB_PORT%
echo 🔧 Alpaca API will be available on port 11111 (ASCOM standard)
echo 📡 Discovery service will be available on port 32227 UDP (ASCOM standard)

echo 🔥 Starting production server...
node wrapper-server.cjs