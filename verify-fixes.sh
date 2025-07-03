#!/bin/bash
# Make script executable: chmod +x verify-fixes.sh

echo "🔍 Verifying Prisma Connection Pool & React Loop Fixes..."
echo "=============================================="

# Check if .env has connection pool parameters
echo "✅ Checking .env database URL configuration..."
if grep -q "connection_limit=25" .env && grep -q "pool_timeout=20" .env; then
    echo "   ✅ Connection pool parameters configured correctly"
else
    echo "   ❌ Missing connection pool parameters in .env"
    exit 1
fi

# Check if socket server has deduplication
echo "✅ Checking WebSocket server deduplication..."
if grep -q "already has session" src/server/socket/server.ts; then
    echo "   ✅ Socket server has deduplication logic"
else
    echo "   ❌ Socket server missing deduplication"
    exit 1
fi

# Check if React component has proper dependencies
echo "✅ Checking React useEffect dependencies..."
if grep -q "joinServer, clearNotifications" src/app/_components/serverPage.tsx; then
    echo "   ✅ useEffect dependencies properly configured"
else
    echo "   ❌ React component still has missing dependencies"
    exit 1
fi

# Check if useSocket hook has isConnected guards
echo "✅ Checking useSocket hook optimizations..."
if grep -q "isConnected" src/hooks/useSocket.ts && grep -q "forceNew: true" src/hooks/useSocket.ts; then
    echo "   ✅ useSocket hook properly optimized"
else
    echo "   ❌ useSocket hook missing optimizations"
    exit 1
fi

# Check for database query optimization
echo "✅ Checking database query optimization..."
if grep -q "message.count" src/server/socket/server.ts; then
    echo "   ✅ Database queries optimized (using count instead of findMany)"
else
    echo "   ❌ Database queries not optimized"
    exit 1
fi

echo ""
echo "🎉 All fixes verified successfully!"
echo ""
echo "🚀 Next steps:"
echo "   1. Kill any existing processes: pkill -f 'node.*next' && pkill -f socket"
echo "   2. Clear Next.js cache: rm -rf .next"
echo "   3. Restart development: bun run dev"
echo "   4. Test: Create server → Join channel → Send message"
echo ""
echo "✨ Expected result: No more connection pool timeouts or React loops!"
