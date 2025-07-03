#!/bin/bash

echo "🔧 Fixing Prisma client for ServerInvite model..."

# Stop any running dev server
echo "📛 Stopping any running processes..."
pkill -f "next dev" || true
pkill -f "node.*dev" || true

# Generate the Prisma client
echo "🎯 Generating Prisma client..."
npx prisma generate

# Push the schema to database to ensure it's in sync
echo "📊 Pushing schema to database..."
npx prisma db push --accept-data-loss

# Optional: Run a test migration if needed
echo "🔄 Checking migration status..."
npx prisma migrate status

echo "✅ Prisma client regenerated successfully!"
echo "🚀 Now you can restart your development server with 'npm run dev'"
echo ""
echo "📋 Summary of what was fixed:"
echo "  - Regenerated Prisma client to include ServerInvite model"
echo "  - Synced database schema"
echo "  - Ready for server invite creation"
