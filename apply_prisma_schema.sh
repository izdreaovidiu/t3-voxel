#!/bin/bash

echo "🚀 Applying Prisma schema changes to database..."

# Push schema changes to database
npx prisma db push

# Generate updated Prisma client
npx prisma generate

echo "✅ Database migration complete!"
echo "📋 ServerInvite table has been created"
echo "🔄 Please restart your development server to use the updated Prisma client"
echo ""
echo "🧪 To test the invite system:"
echo "   1. Generate an invite in your app"
echo "   2. Copy the invite link"
echo "   3. Test the invite link in a new browser tab"
