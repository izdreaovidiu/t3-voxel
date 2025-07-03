#!/bin/bash

echo "🔧 Fixing WebSocket Connection Loop..."
echo "=================================="

# Kill any existing processes
echo "📍 Stopping any running processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
lsof -ti:3003 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

# Clear Next.js cache
echo "🧹 Clearing Next.js cache..."
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Start the application
echo "🚀 Starting application with fixed WebSocket..."
npm run dev

echo ""
echo "✅ Application started! The WebSocket connection loop should be fixed."
echo "📱 Open http://localhost:3000 to test the chat functionality"
echo ""
echo "🔍 What was fixed:"
echo "  - Created useStableSocket hook to manage socket lifecycle"
echo "  - Removed problematic useEffect dependencies"
echo "  - Added proper connection tracking with refs"
echo "  - Fixed message subscription cleanup"
echo ""
echo "If you still see connection issues, check the browser console for errors."
