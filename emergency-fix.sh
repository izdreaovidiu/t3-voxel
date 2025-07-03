#!/bin/bash

echo "🛑 EMERGENCY LOOP FIX - QUICK RESTART"
echo "======================================"

# Kill all processes immediately
echo "💀 Force killing all processes..."
pkill -9 -f "node.*next" 2>/dev/null || true
pkill -9 -f "socket" 2>/dev/null || true  
pkill -9 -f "bun.*dev" 2>/dev/null || true
pkill -9 -f "turbopack" 2>/dev/null || true

# Wait for termination
sleep 3

# Clear all caches aggressively
echo "🧹 Clearing all caches..."
cd /Users/ovidiu/Documents/projects/t3-voxel/voxel
rm -rf .next 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

echo ""
echo "✅ AGGRESSIVE ANTI-LOOP FIXES APPLIED:"
echo "  • 5-second throttling on socket functions"
echo "  • Duplicate join protection"  
echo "  • React debouncing (1s delay)"
echo "  • Connection state validation"
echo ""

# Check if ports are free
echo "🔍 Port status:"
for port in 3000 3001; do
    if lsof -ti:$port >/dev/null 2>&1; then
        echo "❌ Port $port still in use - killing remaining processes"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    else
        echo "✅ Port $port is free"
    fi
done

echo ""
echo "🚀 READY TO START - Run: bun dev"
echo ""
echo "🎯 Expected improvements:"
echo "  • No more loop warnings in console"
echo "  • Throttling messages: '⏱️ Throttling joinServer call'"
echo "  • Clean socket connections"
echo "  • Stable real-time messaging"
echo ""
