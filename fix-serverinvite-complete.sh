#!/bin/bash

# Comprehensive fix for ServerInvite Prisma issue
echo "🔧 FIXING SERVERINVITE PRISMA CLIENT ISSUE"
echo "========================================="

# Step 1: Stop any running processes
echo "📛 Step 1: Stopping development server..."
pkill -f "next dev" || echo "No dev server running"
pkill -f "node.*dev" || echo "No node dev processes"

# Step 2: Clean up node_modules and reinstall (ensures fresh Prisma client)
echo "🧹 Step 2: Cleaning node_modules..."
rm -rf node_modules
rm -rf .next

echo "📦 Step 3: Reinstalling dependencies..."
npm install

# Step 3: Generate Prisma client
echo "🎯 Step 4: Generating Prisma client..."
npx prisma generate

# Step 4: Apply schema to database
echo "📊 Step 5: Pushing schema to database..."
npx prisma db push --accept-data-loss

# Step 5: Verify the fix
echo "🔍 Step 6: Verifying ServerInvite model..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
console.log('Available models:', Object.keys(prisma));
console.log('ServerInvite available:', 'serverInvite' in prisma ? '✅ YES' : '❌ NO');
prisma.\$disconnect();
"

echo ""
echo "✅ FIX COMPLETE!"
echo "🚀 You can now restart your dev server with: npm run dev"
echo "💡 The serverInvite model should now work properly"
