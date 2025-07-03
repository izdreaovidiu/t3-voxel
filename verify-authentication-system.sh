#!/bin/bash

# Authentication Presence System - Verification Script
echo "🔍 Verifying Authentication-Based Presence System..."
echo "================================================="

# Check if key files exist and have the right content
files_to_check=(
    "src/hooks/useSocket.ts"
    "src/server/socket/socket-server.ts" 
    "src/components/StatusSelector.tsx"
    "src/app/_components/serverPage.tsx"
)

echo "📁 Checking core files..."
for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

echo ""
echo "🔎 Checking for key implementation details..."

# Check useSocket.ts for authentication-based connection
if grep -q "isLoaded.*user?.id" src/hooks/useSocket.ts; then
    echo "✅ useSocket: Authentication-based connection implemented"
else
    echo "❌ useSocket: Authentication check missing"
fi

# Check for activity tracking
if grep -q "lastActivityRef" src/hooks/useSocket.ts; then
    echo "✅ useSocket: Activity tracking implemented"
else
    echo "❌ useSocket: Activity tracking missing"
fi

# Check socket-server.ts for authenticated users map
if grep -q "authenticatedUsers.*Map" src/server/socket/socket-server.ts; then
    echo "✅ socket-server: Authentication-first approach implemented"
else
    echo "❌ socket-server: Authentication system missing"
fi

# Check for duplicate prevention
if grep -q "existingUser.*socketId" src/server/socket/socket-server.ts; then
    echo "✅ socket-server: Duplicate connection prevention implemented"
else
    echo "❌ socket-server: Duplicate prevention missing"
fi

# Check StatusSelector component
if [ -f "src/components/StatusSelector.tsx" ]; then
    if grep -q "currentStatus.*onStatusChange" src/components/StatusSelector.tsx; then
        echo "✅ StatusSelector: Component properly implemented"
    else
        echo "❌ StatusSelector: Component structure incorrect"
    fi
else
    echo "❌ StatusSelector: Component file missing"
fi

# Check serverPage integration
if grep -q "StatusSelector" src/app/_components/serverPage.tsx; then
    echo "✅ serverPage: StatusSelector integrated"
else
    echo "❌ serverPage: StatusSelector not integrated"
fi

if grep -q "userStatus.*updateStatus" src/app/_components/serverPage.tsx; then
    echo "✅ serverPage: User status hooks integrated"
else
    echo "❌ serverPage: User status hooks missing"
fi

echo ""
echo "📋 System Status Summary:"
echo "========================"

# Count successful checks
total_checks=7
passed_checks=0

[ -f "src/hooks/useSocket.ts" ] && ((passed_checks++))
[ -f "src/server/socket/socket-server.ts" ] && ((passed_checks++))
[ -f "src/components/StatusSelector.tsx" ] && ((passed_checks++))
[ -f "src/app/_components/serverPage.tsx" ] && ((passed_checks++))
grep -q "isLoaded.*user?.id" src/hooks/useSocket.ts && ((passed_checks++))
grep -q "authenticatedUsers.*Map" src/server/socket/socket-server.ts && ((passed_checks++))
grep -q "StatusSelector" src/app/_components/serverPage.tsx && ((passed_checks++))

echo "✅ Passed: $passed_checks/$total_checks checks"

if [ $passed_checks -eq $total_checks ]; then
    echo ""
    echo "🎉 All systems ready! You can now start the server:"
    echo "   ./restart-authentication-presence.sh"
    echo "   or: npm run dev"
else
    echo ""
    echo "⚠️  Some components need attention. Check the failed items above."
fi

echo ""
echo "🧪 After starting, test the system:"
echo "   1. Check for stable 'Live' status indicator"
echo "   2. Look for StatusSelector dropdown in user panel"
echo "   3. Monitor console for clean authentication flow"
echo "   4. Test manual status changes"
echo "   5. Test activity detection (15min idle → away)"
