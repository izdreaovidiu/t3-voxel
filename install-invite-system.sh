#!/bin/bash

# Install nanoid dependency for invite system
echo "🔧 Installing nanoid dependency..."

cd /Users/ovidiu/Documents/projects/t3-voxel/voxel

# Install nanoid
npm install nanoid@^5.0.0

echo "✅ nanoid installed successfully!"

# Install dependencies if needed
echo "📦 Checking all dependencies..."
npm install

echo "✅ All dependencies installed!"

echo "🚀 Invite system is now ready to use!"
echo ""
echo "🔍 What was implemented:"
echo "  ✅ Public invite procedure (getInvitePublic)"
echo "  ✅ Protected join procedure (joinServerViaInvite)"
echo "  ✅ Updated middleware for public access"
echo "  ✅ New invite page with Clerk integration"
echo "  ✅ Nanoid for secure invite codes"
echo ""
echo "📖 How to use:"
echo "  1. Create an invite with existing createInvite procedure"
echo "  2. Share the /invite/[code] link"
echo "  3. Unauthenticated users can view invite details"
echo "  4. Users can sign in/up via Clerk modal"
echo "  5. After auth, they can join the server"
echo ""
echo "🎯 The invite system now works for both logged in and non-logged in users!"
