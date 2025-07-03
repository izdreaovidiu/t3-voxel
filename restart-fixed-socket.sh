#!/bin/bash

echo "🔧 Fixing socket connection loop issue..."

# Kill any existing processes
echo "🛑 Stopping existing processes..."
pkill -f "next dev" || true
pkill -f "node" || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Clear Next.js cache
echo "🧹 Clearing cache..."
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies if needed
echo "📦 Checking dependencies..."
npm install

# Start the development server
echo "🚀 Starting server with fixed socket implementation..."
npm run dev
