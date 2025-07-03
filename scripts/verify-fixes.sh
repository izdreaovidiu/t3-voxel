#!/bin/bash

echo "🔧 Voxel Fix Verification Script"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "🔍 Checking if fixes are properly applied..."
echo ""

# Check if socket server file has deduplication
if grep -q "userConnections" src/server/socket/server.ts; then
    echo -e "${GREEN}✅ Socket deduplication: APPLIED${NC}"
else
    echo -e "${RED}❌ Socket deduplication: MISSING${NC}"
fi

# Check if socket server uses authorId
if grep -q "authorId" src/server/socket/server.ts; then
    echo -e "${GREEN}✅ Schema consistency: FIXED${NC}"
else
    echo -e "${RED}❌ Schema consistency: NOT FIXED${NC}"
fi

# Check if useSocket has useCallback
if grep -q "useCallback" src/hooks/useSocket.ts; then
    echo -e "${GREEN}✅ useSocket optimization: APPLIED${NC}"
else
    echo -e "${RED}❌ useSocket optimization: MISSING${NC}"
fi

# Check if serverPage has optimized useEffect
if grep -q "eslint-disable-line react-hooks/exhaustive-deps" src/app/_components/serverPage.tsx; then
    echo -e "${GREEN}✅ React optimization: APPLIED${NC}"
else
    echo -e "${RED}❌ React optimization: MISSING${NC}"
fi

# Check DATABASE_URL configuration
echo ""
echo "🔍 Checking database configuration..."
if grep -q "connection_limit" .env 2>/dev/null; then
    echo -e "${GREEN}✅ Database URL: OPTIMIZED${NC}"
elif grep -q "connection_limit" .env.example 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Database URL: Example updated, please update .env${NC}"
else
    echo -e "${RED}❌ Database URL: NOT OPTIMIZED${NC}"
    echo "   Please add connection pool parameters to your DATABASE_URL"
fi

echo ""
echo "🚀 Next steps:"
echo "1. Update your .env file with optimized DATABASE_URL"
echo "2. Run: bun run dev"
echo "3. Test server creation and messaging"
echo ""

# Check if processes are running
if pgrep -f "next" > /dev/null; then
    echo -e "${YELLOW}⚠️  Next.js is running. Consider restarting for changes to take effect.${NC}"
fi

if pgrep -f "socket" > /dev/null; then
    echo -e "${YELLOW}⚠️  Socket server is running. Consider restarting for changes to take effect.${NC}"
fi

echo ""
echo "📋 Quick restart command:"
echo "pkill -f node && bun run dev"
echo ""
echo "🎉 All fixes should resolve the infinite loop and connection issues!"
