#!/bin/bash

# Enhanced Voice Channel Setup Script
# This script sets up the voice channel system for your Voxel project

echo "🎤 Setting up Enhanced Voice Channel System..."
echo "================================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

# Check if enhanced schema exists
if [ ! -f "ENHANCED_SCHEMA.prisma" ]; then
    print_error "ENHANCED_SCHEMA.prisma not found. Please ensure all files are in place."
    exit 1
fi

print_info "Step 1: Backing up current schema..."
if [ -f "prisma/schema.prisma" ]; then
    cp prisma/schema.prisma prisma/schema.prisma.backup
    print_status "Current schema backed up to prisma/schema.prisma.backup"
else
    print_warning "No existing schema found"
fi

print_info "Step 2: Applying enhanced schema..."
cp ENHANCED_SCHEMA.prisma prisma/schema.prisma
print_status "Enhanced schema applied"

print_info "Step 3: Generating Prisma client..."
if npm run db:generate; then
    print_status "Prisma client generated successfully"
else
    print_error "Failed to generate Prisma client"
    print_info "Restoring backup schema..."
    if [ -f "prisma/schema.prisma.backup" ]; then
        cp prisma/schema.prisma.backup prisma/schema.prisma
        print_status "Schema restored from backup"
    fi
    exit 1
fi

print_info "Step 4: Pushing schema to database..."
if npm run db:push; then
    print_status "Database schema updated successfully"
else
    print_error "Failed to push schema to database"
    print_warning "You may need to run this manually or check your database connection"
fi

print_info "Step 5: Applying database migrations (if needed)..."
if [ -f "DATABASE_VOICE_SCHEMA.sql" ]; then
    print_info "SQL schema file found. Apply it manually if needed:"
    echo "  psql -d your_database -f DATABASE_VOICE_SCHEMA.sql"
fi

echo ""
print_status "Enhanced Voice Channel Setup Complete! 🎉"
echo ""
echo "What's been set up:"
echo "✅ Enhanced Socket Context Provider configured in layout.tsx"
echo "✅ Voice Channel Demo page created at /voice-demo"
echo "✅ Database schema enhanced with voice channel features"
echo "✅ All voice components and hooks are ready to use"
echo ""
echo "Next steps:"
echo "1. Start your development server: npm run dev"
echo "2. Visit http://localhost:3000/voice-demo to test the voice channel"
echo "3. Check the server console for WebSocket connection logs"
echo ""
echo "Example usage in your components:"
echo ""
echo "import { useVoiceChannel } from '~/hooks/useVoiceChannel';"
echo "import EnhancedVoiceChannel from '~/components/voice/EnhancedVoiceChannel';"
echo ""
echo "function YourServerPage() {"
echo "  const [voiceState, voiceControls] = useVoiceChannel({"
echo "    channelId: 'your-channel-id',"
echo "    enableSpeakingDetection: true,"
echo "  });"
echo ""
echo "  return ("
echo "    <EnhancedVoiceChannel"
echo "      channelId='your-channel-id'"
echo "      channelName='General Voice'"
echo "      isInChannel={voiceState.isConnected}"
echo "      participants={voiceState.participants}"
echo "      currentUser={{...}}"
echo "      onJoinChannel={voiceControls.joinChannel}"
echo "      onLeaveChannel={voiceControls.leaveChannel}"
echo "      onToggleAudio={voiceControls.toggleAudio}"
echo "      onToggleVideo={voiceControls.toggleVideo}"
echo "      onToggleDeafen={voiceControls.toggleDeafen}"
echo "      onToggleScreenShare={voiceControls.startScreenShare}"
echo "    />"
echo "  );"
echo "}"
echo ""
print_info "For more information, check the documentation files in your project."
