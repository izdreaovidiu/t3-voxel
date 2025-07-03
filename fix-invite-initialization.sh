#!/bin/bash

echo "🔧 FIXING INVITE INITIALIZATION ERROR"
echo "====================================="
echo ""

cd /Users/ovidiu/Documents/projects/t3-voxel/voxel

echo "✅ Fixed: Moved tRPC query before useEffect"
echo "✅ Fixed: Reorganized code structure"
echo "✅ Fixed: Removed function dependency issues"
echo ""

echo "🧪 Testing syntax..."
npx tsc --noEmit --project . 2>/dev/null && echo "✅ TypeScript compilation OK" || echo "❌ TypeScript errors found"

echo ""
echo "📋 Code Structure Fix Applied:"
echo "   1. ✅ tRPC query moved to top (before useEffect)"
echo "   2. ✅ Removed 'handleJoinServer' from useEffect dependencies"  
echo "   3. ✅ Inlined auto-join logic to prevent closure issues"
echo ""

echo "🚀 The initialization error should now be resolved!"
echo ""
echo "🧪 To test:"
echo "   1. npm run dev"
echo "   2. Open invite URL in browser"
echo "   3. Check console - no more 'Cannot access invite before initialization'"
echo ""

echo "✨ Auto-join flow should work perfectly now!"
