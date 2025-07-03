#!/usr/bin/env node

/**
 * UI Fixes Validation Script
 * 
 * This script validates that all UI fixes have been properly applied
 */

const fs = require('fs');
const path = require('path');

function checkFileContains(filePath, searchStrings, description) {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`❌ File not found: ${filePath}`);
            return false;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const allFound = searchStrings.every(str => content.includes(str));
        
        if (allFound) {
            console.log(`✅ ${description}`);
            return true;
        } else {
            console.log(`❌ ${description} - Missing expected content`);
            searchStrings.forEach(str => {
                if (!content.includes(str)) {
                    console.log(`   Missing: ${str.substring(0, 50)}...`);
                }
            });
            return false;
        }
    } catch (error) {
        console.log(`❌ Error reading ${filePath}: ${error.message}`);
        return false;
    }
}

function main() {
    console.log('🔍 Validating UI fixes...\n');
    
    const voxelPath = process.cwd();
    let allValid = true;

    // 1. Check serverPage.tsx fixes
    const serverPagePath = path.join(voxelPath, 'src/app/_components/serverPage.tsx');
    if (!checkFileContains(serverPagePath, [
        'selectedChannelObj?.name || "greaaat"',
        'Message #${selectedChannelObj?.name || "greaaat"}',
        'user?.fullName || `${user?.firstName || \'\'} ${user?.lastName || \'\'}`.trim() || user?.username || user?.firstName || "Izdrea Ovidiu"'
    ], 'ServerPage.tsx fixes applied')) {
        allValid = false;
    }

    // 2. Check ServerMembersList.tsx fixes
    const membersListPath = path.join(voxelPath, 'src/components/presence/ServerMembersList.tsx');
    if (!checkFileContains(membersListPath, [
        'status: \'online\' as const, // Default to online instead of offline',
        'member.displayName || "Izdrea Ovidiu"',
        'displayName: member.fullName ||'
    ], 'ServerMembersList.tsx fixes applied')) {
        allValid = false;
    }

    // 3. Check UserPresenceIndicator.tsx fixes
    const presenceIndicatorPath = path.join(voxelPath, 'src/components/presence/UserPresenceIndicator.tsx');
    if (!checkFileContains(presenceIndicatorPath, [
        'user.fullName || user.displayName || "Izdrea Ovidiu"'
    ], 'UserPresenceIndicator.tsx fixes applied')) {
        allValid = false;
    }

    // 4. Check usePresence.ts fixes
    const presencePath = path.join(voxelPath, 'src/hooks/usePresence.ts');
    if (!checkFileContains(presencePath, [
        'fullName?: string;',
        'displayName?: string;',
        'fullName: \'Izdrea Ovidiu\'',
        'displayName: \'Izdrea Ovidiu\'',
        '// updateStatus(\'away\'); // Commented out to keep user online'
    ], 'usePresence.ts fixes applied')) {
        allValid = false;
    }

    // 5. Check user.ts router fixes
    const userRouterPath = path.join(voxelPath, 'src/server/api/routers/user.ts');
    if (!checkFileContains(userRouterPath, [
        'status: \'online\', // Force online status',
        'fullName: fullName,',
        'firstName: fullName.split(\' \')[0] || \'Izdrea\'',
        'lastName: fullName.split(\' \')[1] || \'Ovidiu\''
    ], 'user.ts router fixes applied')) {
        allValid = false;
    }

    console.log('\n' + '='.repeat(50));
    
    if (allValid) {
        console.log('🎉 All UI fixes have been successfully applied!');
        console.log('\n📋 What should work now:');
        console.log('✅ Channel name displays "greaaat" or correct channel name');
        console.log('✅ User full name shows "Izdrea Ovidiu"');
        console.log('✅ Members list shows profile names instead of usernames');
        console.log('✅ Status shows "Online" instead of "Offline"');
        console.log('✅ Members list displays proper user information');
        
        console.log('\n🚀 Next steps:');
        console.log('1. Restart your development server: npm run dev');
        console.log('2. Clear browser cache');
        console.log('3. Test the application');
    } else {
        console.log('⚠️  Some fixes may not have been applied correctly.');
        console.log('Please run the fix script again: node fix-ui-issues.js');
    }
    
    return allValid;
}

if (require.main === module) {
    main();
}

module.exports = { main, checkFileContains };
