#!/bin/bash

# Quick Fix for Missing Invite Issue
# This script will fix the immediate problem with the missing invite

echo "🔧 Quick Fix: Missing Invite Issue"
echo "=================================="
echo ""

# Navigate to project directory
cd "$(dirname "$0")/../.."

echo "📍 Current directory: $(pwd)"
echo ""

# Check if we have Node.js and the required dependencies
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Make sure you're in the project root."
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "🔄 Installing dependencies..."
    bun install
fi

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npx prisma generate

# Check database connection
echo "🔄 Checking database connection..."
npx prisma db push --skip-generate

# Run the invite management script to fix the missing invite
echo ""
echo "🔧 Fixing missing invite (7p9lxt4i31e)..."
node scripts/invite-management/manage-invites.js fix-missing

echo ""
echo "✅ Quick fix completed!"
echo ""
echo "📋 To verify the fix:"
echo "1. Start your development server: bun dev"
echo "2. Visit: http://localhost:3000/invite/7p9lxt4i31e"
echo "3. The invite should now work!"
echo ""
echo "🔍 To manage invites in the future:"
echo "   node scripts/invite-management/manage-invites.js list"
echo "   node scripts/invite-management/manage-invites.js create"
