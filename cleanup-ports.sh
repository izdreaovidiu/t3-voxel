#!/bin/bash

echo "🛑 FORCE KILLING ALL PROCESSES ON PORTS 3000 & 3001"
echo "===================================================="

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    echo "🔍 Checking port $port..."
    
    # Get PIDs using the port
    pids=$(lsof -ti:$port 2>/dev/null)
    
    if [ -n "$pids" ]; then
        echo "🔴 Found processes on port $port: $pids"
        echo "💀 Force killing processes..."
        echo "$pids" | xargs kill -9 2>/dev/null
        sleep 1
        
        # Double check if port is free
        remaining=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$remaining" ]; then
            echo "⚠️  Some processes still running, trying again..."
            echo "$remaining" | xargs kill -9 2>/dev/null
        fi
        
        echo "✅ Port $port cleaned"
    else
        echo "✅ Port $port is already free"
    fi
}

# Kill processes on both ports
kill_port 3000
kill_port 3001

echo ""
echo "🧹 CLEANING UP ALL RELATED PROCESSES"
echo "===================================="

# Kill any remaining node/bun processes
pkill -f "node.*next" 2>/dev/null && echo "✅ Killed Next.js processes" || echo "ℹ️  No Next.js processes found"
pkill -f "socket" 2>/dev/null && echo "✅ Killed socket processes" || echo "ℹ️  No socket processes found"  
pkill -f "bun.*dev" 2>/dev/null && echo "✅ Killed bun dev processes" || echo "ℹ️  No bun dev processes found"
pkill -f "turbopack" 2>/dev/null && echo "✅ Killed turbopack processes" || echo "ℹ️  No turbopack processes found"

# Wait for processes to fully terminate
sleep 3

echo ""
echo "🔍 FINAL PORT CHECK"
echo "=================="

# Verify ports are free
for port in 3000 3001; do
    if lsof -ti:$port >/dev/null 2>&1; then
        echo "❌ Port $port still in use!"
        lsof -i:$port
    else
        echo "✅ Port $port is free"
    fi
done

echo ""
echo "🧽 CLEARING CACHES"
echo "=================="

cd /Users/ovidiu/Documents/projects/t3-voxel/voxel

# Clear Next.js cache
if [ -d ".next" ]; then
    rm -rf .next
    echo "✅ Cleared .next cache"
fi

# Clear turbopack cache
if [ -d ".next/cache" ]; then
    rm -rf .next/cache
    echo "✅ Cleared turbopack cache"
fi

echo ""
echo "🚀 READY TO RESTART"
echo "==================="
echo ""
echo "Now run: bun dev"
echo ""
echo "Expected ports:"
echo "  • Next.js: http://localhost:3000"  
echo "  • Socket.IO: http://localhost:3001"
echo ""
