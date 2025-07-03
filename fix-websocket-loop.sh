#!/bin/bash

echo "🧹 Cleaning up WebSocket connections and processes..."

# Kill any processes running on port 3001 (old socket server)
echo "Killing processes on port 3001..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || echo "No processes found on port 3001"

# Kill any processes running on port 3000 (Next.js)
echo "Killing processes on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "No processes found on port 3000"

# Clear node_modules cache (if needed)
echo "Clearing Next.js cache..."
rm -rf .next/cache 2>/dev/null || echo "No cache to clear"

echo "✅ Cleanup complete!"

# Wait a moment for processes to fully terminate
sleep 2

echo "🚀 Starting application..."
npm run dev
