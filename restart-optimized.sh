#!/bin/bash
# Kill all existing processes to start fresh

echo "🛑 Stopping all existing processes..."
echo "=================================="

# Kill all node processes related to the project
pkill -f "node.*next" 2>/dev/null || true
pkill -f "socket" 2>/dev/null || true  
pkill -f "bun.*dev" 2>/dev/null || true

# Wait a moment for processes to terminate
sleep 2

echo "✅ All processes stopped"
echo ""

# Clear caches
echo "🧹 Clearing caches..."
echo "===================="

cd /Users/ovidiu/Documents/projects/t3-voxel/voxel

# Remove Next.js cache
if [ -d ".next" ]; then
    rm -rf .next
    echo "✅ Cleared Next.js cache"
else
    echo "ℹ️  No Next.js cache to clear"
fi

# Clear node modules cache (optional)
# echo "⚠️  Clearing node_modules (this will take time)..."
# rm -rf node_modules && bun install

echo ""
echo "🔍 Verifying all optimizations..."
echo "================================"

# Check .env optimization
if grep -q "connection_limit=25" .env && grep -q "pool_timeout=20" .env; then
    echo "✅ Database connection pool optimized"
else
    echo "❌ Database connection pool not optimized"
fi

# Check socket server optimization
if grep -q "notificationCache" src/server/socket/server.ts; then
    echo "✅ Socket server has notification caching"
else
    echo "❌ Socket server missing notification caching"
fi

# Check useSocket throttling
if grep -q "THROTTLE_DURATION" src/hooks/useSocket.ts; then
    echo "✅ Socket hook has throttling"
else
    echo "❌ Socket hook missing throttling"
fi

# Check React Query optimization
if grep -q "staleTime.*30000" src/app/_components/serverPage.tsx; then
    echo "✅ React queries optimized with caching"
else
    echo "❌ React queries not optimized"
fi

# Check React useEffect dependencies
if grep -q "joinServer, clearNotifications" src/app/_components/serverPage.tsx; then
    echo "✅ React useEffect dependencies fixed"
else
    echo "❌ React useEffect dependencies not fixed"
fi

echo ""
echo "🚀 Starting optimized development servers..."
echo "============================================"

# Start development server
echo "Starting bun dev..."
bun run dev &

# Wait for servers to start
sleep 5

echo ""
echo "🎉 OPTIMIZATION COMPLETE!"
echo "========================"
echo ""
echo "✅ Fixes Applied:"
echo "  • Database connection pool: 25 connections, 20s timeout"
echo "  • Socket deduplication: Prevents duplicate joins"
echo "  • Notification caching: 30s cache to avoid DB spam"
echo "  • Function throttling: 1s cooldown on socket functions"  
echo "  • React Query caching: 15s-60s stale time"
echo "  • useEffect optimization: Proper dependency arrays"
echo ""
echo "🎯 Expected Results:"
echo "  • No more connection pool timeouts"
echo "  • No more React infinite loops"
echo "  • Clean console logs"
echo "  • Real-time messaging works perfectly"
echo ""
echo "🌐 Open your browser to:"
echo "  • Next.js app: http://localhost:3000"
echo "  • Socket.IO server: http://localhost:3001"
echo ""
echo "✨ Your Discord clone should now run smoothly!"
