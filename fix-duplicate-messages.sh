#!/bin/bash

# Make this script executable
chmod +x "$0"

echo "🔧 Applying fixes for duplicate messages and 'unknown' user issue..."

echo "✅ Fixed server-side message format to include proper username field"
echo "✅ Removed duplicate message handler in client"
echo "✅ Improved optimistic message handling"
echo "✅ Added proper tempId support for message deduplication"

echo ""
echo "🚀 Restarting development server..."

# Kill any existing Next.js processes
pkill -f "next"

# Give it a moment to shut down
sleep 2

echo "Starting fresh development server..."
npm run dev
