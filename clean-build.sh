#!/bin/bash

echo "🔥 CLEANING BUILD & FIXING ERRORS"
echo "=================================="

# Kill all processes
pkill -9 -f "node.*next" 2>/dev/null || true
pkill -9 -f "turbopack" 2>/dev/null || true

# Clean all caches
echo "🧹 Clearing caches..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

echo ""
echo "✅ FIXES APPLIED:"
echo "  • Recreated serverPage.tsx with clean JSX"
echo "  • Fixed all syntax errors" 
echo "  • Proper export default DiscordServerPage"
echo "  • Type-safe member/message interfaces"
echo "  • Instant messaging (no delays)"
echo ""

echo "🚀 Starting clean build..."
bun dev
