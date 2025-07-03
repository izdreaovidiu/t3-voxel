#!/bin/bash

echo "🔄 Restarting Socket.IO server with connection loop fixes..."

# Kill any existing processes
echo "🛑 Stopping existing processes..."
pkill -f "next dev" || true
pkill -f "node.*3000" || true
sleep 2

# Clear any port locks
echo "🧹 Clearing port locks..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1

# Start the server
echo "🚀 Starting server with fixes..."
npm run dev

echo "✅ Server restarted with Socket.IO connection loop fixes!"
