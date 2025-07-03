#!/bin/bash
# Make this script executable: chmod +x quick-screen-share-test.sh

# Screen Share Quick Test & Fix Script
# Pentru proiectul t3-voxel

echo "🖥️  Screen Share Quick Test & Fix Script"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="/Users/ovidiu/Documents/projects/t3-voxel/voxel"

echo -e "${BLUE}📍 Current directory: ${PWD}${NC}"
echo -e "${BLUE}📍 Project directory: ${PROJECT_DIR}${NC}"

# Check if we're in the right directory
if [ ! -d "${PROJECT_DIR}" ]; then
    echo -e "${RED}❌ Project directory not found: ${PROJECT_DIR}${NC}"
    exit 1
fi

cd "${PROJECT_DIR}"

echo ""
echo -e "${YELLOW}🔍 Checking browser and system setup...${NC}"

# Check if we're running on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${GREEN}✅ Running on macOS${NC}"
    
    # Check system version
    SW_VERS=$(sw_vers -productVersion)
    echo -e "${BLUE}📋 System version: ${SW_VERS}${NC}"
    
    # Check for browsers
    if [ -d "/Applications/Brave Browser.app" ]; then
        echo -e "${GREEN}✅ Brave Browser found${NC}"
    else
        echo -e "${YELLOW}⚠️  Brave Browser not found${NC}"
    fi
    
    if [ -d "/Applications/Google Chrome.app" ]; then
        echo -e "${GREEN}✅ Chrome found${NC}"
    else
        echo -e "${YELLOW}⚠️  Chrome not found${NC}"
    fi
    
else
    echo -e "${YELLOW}⚠️  Not running on macOS - some checks may not apply${NC}"
fi

echo ""
echo -e "${YELLOW}🔍 Checking project files...${NC}"

# Check if our modified files exist
if [ -f "src/hooks/useWebRTC.ts" ]; then
    echo -e "${GREEN}✅ useWebRTC.ts found${NC}"
else
    echo -e "${RED}❌ useWebRTC.ts not found${NC}"
fi

if [ -f "debug-screen-share.html" ]; then
    echo -e "${GREEN}✅ Debug HTML tool found${NC}"
else
    echo -e "${RED}❌ Debug HTML tool not found${NC}"
fi

if [ -f "src/components/debug/ScreenShareDebug.tsx" ]; then
    echo -e "${GREEN}✅ Debug React component found${NC}"
else
    echo -e "${RED}❌ Debug React component not found${NC}"
fi

echo ""
echo -e "${YELLOW}🔧 Quick fixes...${NC}"

# Kill any running Next.js processes
echo "🛑 Stopping any running Next.js processes..."
pkill -f "node.*next" 2>/dev/null && echo -e "${GREEN}✅ Stopped Next.js processes${NC}" || echo -e "${BLUE}ℹ️  No Next.js processes running${NC}"

# Clear Next.js cache
if [ -d ".next" ]; then
    echo "🧹 Clearing Next.js cache..."
    rm -rf .next
    echo -e "${GREEN}✅ Next.js cache cleared${NC}"
fi

# Clear node_modules cache
if [ -d "node_modules/.cache" ]; then
    echo "🧹 Clearing node_modules cache..."
    rm -rf node_modules/.cache
    echo -e "${GREEN}✅ Node modules cache cleared${NC}"
fi

echo ""
echo -e "${YELLOW}🚀 Starting application...${NC}"

# Check if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing dependencies..."
    npm install --silent
    
    echo ""
    echo "🎯 Opening debug tools..."
    
    # Open debug HTML in default browser
    if [ -f "debug-screen-share.html" ]; then
        open "debug-screen-share.html"
        echo -e "${GREEN}✅ Debug HTML tool opened in browser${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}🚀 Starting development server...${NC}"
    echo -e "${BLUE}ℹ️  Server will start on http://localhost:3000${NC}"
    echo -e "${BLUE}ℹ️  Debug HTML tool should open automatically${NC}"
    echo ""
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo -e "   1. Test screen share in the HTML debug tool first"
    echo -e "   2. Check console logs for any errors"
    echo -e "   3. If HTML tool works, test in the main app"
    echo -e "   4. If issues persist, check browser permissions"
    echo ""
    echo -e "${YELLOW}🐛 Debugging tips:${NC}"
    echo -e "   • Open browser dev tools (F12 or Cmd+Option+I)"
    echo -e "   • Look for console errors"
    echo -e "   • Try different browsers (Chrome, Safari, Brave)"
    echo -e "   • Check System Preferences > Security & Privacy > Screen Recording"
    echo ""
    echo -e "${BLUE}Press Ctrl+C to stop the server when done testing${NC}"
    echo ""
    
    # Start development server
    npm run dev
    
else
    echo -e "${RED}❌ package.json not found in project directory${NC}"
    exit 1
fi
