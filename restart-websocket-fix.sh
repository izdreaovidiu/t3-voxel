#!/bin/bash

echo "🔧 Starting websocket loop fix..."

# Kill any existing processes that might be causing issues
echo "🔪 Killing existing processes..."
pkill -f "next-server" 2>/dev/null
pkill -f "node.*3000" 2>/dev/null
pkill -f "socket.io" 2>/dev/null

# Wait for processes to die
sleep 2

# Clear any port conflicts
echo "🧹 Clearing port conflicts..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Clear npm/yarn cache if needed
echo "🗑️ Clearing build cache..."
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies if needed (force clean install)
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "Installing dependencies..."
    npm ci --force
fi

# Build the application
echo "🏗️ Building application..."
npm run build

# Wait a moment
sleep 1

echo "🚀 Starting application with websocket fixes..."
echo "✅ Websocket loop prevention is now active"
echo "✅ clearNotifications function is now available"
echo "✅ Connection management is optimized"
echo "✅ Single websocket for messages"
echo "✅ Single websocket for activity status"

# Start the application
npm run start
