#!/bin/bash

echo "🔄 Restarting application with simplified socket logic..."

# Kill any running processes
echo "⏹️ Stopping existing processes..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "node" 2>/dev/null || true

# Clean up any stale socket connections
echo "🧹 Cleaning up socket connections..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Wait a moment
sleep 2

# Start the application
echo "🚀 Starting application..."
npm run dev

echo "✅ Application restarted with simplified socket logic!"
echo ""
echo "Changes made:"
echo "• Socket server no longer immediately removes users on disconnect"
echo "• Users are marked as 'offline' but remain in servers"
echo "• Full cleanup happens after 5 minutes of inactivity"
echo "• Added explicit logout for intentional disconnects"
echo "• Simplified client-side disconnect handling"
echo ""
echo "This should fix the 'user cleaned up' loop issue!"
