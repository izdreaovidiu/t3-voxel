#!/bin/bash

# Connection Loop Fix - Restart Script
echo "🔧 Applying Connection Loop Fix..."
echo "======================================="

# Kill any existing processes on common Next.js ports
echo "🔌 Cleaning up existing connections..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Wait a moment for cleanup
sleep 2

# Clear Next.js cache
echo "🧹 Clearing Next.js cache..."
rm -rf .next 2>/dev/null || true

# Clear node modules cache (optional, uncomment if needed)
# echo "🗑️  Clearing node modules cache..."
# rm -rf node_modules/.cache 2>/dev/null || true

echo ""
echo "✅ Fix Applied Successfully!"
echo "======================================="
echo "📝 Changes made:"
echo "   • Fixed socket connection loop in useSocket.ts"
echo "   • Prevented duplicate connections in socket-server.ts"
echo "   • Reduced reconnection attempts and improved stability"
echo ""
echo "🚀 Starting development server..."
echo "   Monitor console for stable 'Socket connected' messages"
echo "   Look for 'Live' indicator staying stable (no rapid switching)"
echo ""

# Start the development server
if command -v bun &> /dev/null; then
    echo "Using Bun..."
    bun run dev
elif command -v yarn &> /dev/null; then
    echo "Using Yarn..."
    yarn dev
else
    echo "Using npm..."
    npm run dev
fi
