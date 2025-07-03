#!/bin/bash

# Make script executable
chmod +x "$0"

echo "🔄 Restarting with simplified WebSocket implementation..."

# Kill any existing processes
echo "🛑 Stopping existing processes..."
killall node 2>/dev/null || true
killall next 2>/dev/null || true

# Clean build cache
echo "🧹 Cleaning build cache..."
rm -rf .next
rm -rf node_modules/.cache

echo "🚀 Starting development server..."
npm run dev
