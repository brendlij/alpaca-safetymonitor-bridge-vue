#!/bin/bash

# Production start script for Alpaca Safety Monitor Bridge
# This script builds the frontend and starts the production server

echo "🚀 Starting Alpaca Safety Monitor Bridge in production mode..."

# Set production environment
export NODE_ENV=production

# Use environment variables or defaults
WEB_PORT=${WEB_PORT:-3000}

echo "📦 Building frontend..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi

echo "✅ Frontend build completed"
echo "🌐 Web interface will be available on port $WEB_PORT"
echo "🔧 Alpaca API will be available on port 11111 (ASCOM standard)"
echo "📡 Discovery service will be available on port 32227 UDP (ASCOM standard)"

echo "🔥 Starting production server..."
node wrapper-server.cjs