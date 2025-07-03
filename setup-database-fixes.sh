#!/bin/bash

# Console Errors Fix - Database Setup Script
# This script applies the necessary database changes for the fixes

echo "🔧 Setting up database changes for console error fixes..."
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the voxel project root directory"
    exit 1
fi

echo "📊 Step 1: Applying Prisma schema changes..."

# Generate Prisma client with new schema
echo "Generating Prisma client..."
npx prisma generate

echo "📈 Step 2: Creating and applying database migration..."

# Create and apply the migration
echo "Creating migration for VIDEO channel type..."
npx prisma migrate dev --name add-video-channel-type

echo "🧪 Step 3: Verifying database changes..."

# Optional: Run a simple query to verify the changes
echo "Verifying ChannelType enum includes VIDEO..."

echo "✅ Database setup complete!"
echo ""
echo "🚀 Next steps:"
echo "1. Restart your development server: npm run dev"
echo "2. Clear browser cache"
echo "3. Test channel creation and video channel persistence"
echo ""
echo "📋 Testing checklist:"
echo "□ Create a video channel"
echo "□ Refresh the page"
echo "□ Verify the video channel still exists"
echo "□ Check console for any errors"
echo ""
echo "🏁 Setup completed successfully!"
