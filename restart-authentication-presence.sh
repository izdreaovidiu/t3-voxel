#!/bin/bash

# Authentication-Based Presence System - Restart Script
echo "🔐 Applying Authentication-Based Presence System..."
echo "==============================================="

# Kill any existing processes on common Next.js ports
echo "🔌 Cleaning up existing connections..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Wait a moment for cleanup
sleep 2

# Clear Next.js cache
echo "🧹 Clearing Next.js cache..."
rm -rf .next 2>/dev/null || true

echo ""
echo "✅ Authentication-Based Presence System Applied!"
echo "==============================================="
echo "📝 New System Features:"
echo "   • Socket connects only when user is authenticated"
echo "   • Login → Online, 15min inactive → Away, Close tab → Offline"
echo "   • Activity tracking with auto-status changes"
echo "   • Manual status control via StatusSelector dropdown"
echo "   • No more connection loops or duplicates"
echo ""
echo "🎯 What to Look For:"
echo "   • Single 'Socket connected' message per user"
echo "   • Stable 'Live' indicator in top right"
echo "   • StatusSelector dropdown in bottom-left user panel"
echo "   • Clean console output with authentication flow"
echo ""
echo "🧪 Testing:"
echo "   1. Login → should show Online status"
echo "   2. Idle 15min → should auto-change to Away"
echo "   3. Move mouse → should return to Online"
echo "   4. Use dropdown → manually change status"
echo "   5. Close tab → should set Offline"
echo ""

# Start the development server
if command -v bun &> /dev/null; then
    echo "🚀 Starting server with Bun..."
    bun run dev
elif command -v yarn &> /dev/null; then
    echo "🚀 Starting server with Yarn..."
    yarn dev
else
    echo "🚀 Starting server with npm..."
    npm run dev
fi
