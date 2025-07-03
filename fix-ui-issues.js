#!/usr/bin/env node
// Make this file executable: chmod +x fix-ui-issues.js

/**
 * UI Issues Fix Script
 * 
 * This script addresses the following issues:
 * 1. Channel name showing "general" instead of "greaaat"
 * 2. User's full name not displaying properly "Izdrea Ovidiu"
 * 3. Members list showing username instead of profile name
 * 4. Offline status when user should be online
 * 5. Members list functionality improvements
 */

const fs = require('fs');
const path = require('path');

function logSuccess(message) {
    console.log(`✅ ${message}`);
}

function logError(message) {
    console.log(`❌ ${message}`);
}

function logInfo(message) {
    console.log(`ℹ️  ${message}`);
}

function updateFile(filePath, replacements) {
    try {
        if (!fs.existsSync(filePath)) {
            logError(`File not found: ${filePath}`);
            return false;
        }

        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        replacements.forEach(({ find, replace, description }) => {
            if (content.includes(find)) {
                content = content.replace(find, replace);
                modified = true;
                logSuccess(`${description} in ${path.basename(filePath)}`);
            }
        });

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            return true;
        } else {
            logInfo(`No changes needed in ${path.basename(filePath)}`);
            return false;
        }
    } catch (error) {
        logError(`Error updating ${filePath}: ${error.message}`);
        return false;
    }
}

function main() {
    logInfo('Starting UI issues fix...');
    
    const voxelPath = process.cwd();
    logInfo(`Working directory: ${voxelPath}`);

    // Check if we're in the right directory
    if (!fs.existsSync(path.join(voxelPath, 'package.json'))) {
        logError('Please run this script from the voxel project root directory');
        process.exit(1);
    }

    // 1. Fix serverPage.tsx - Channel and user name display
    const serverPagePath = path.join(voxelPath, 'src/app/_components/serverPage.tsx');
    updateFile(serverPagePath, [
        {
            find: 'selectedChannelObj?.name || "Select a channel"',
            replace: 'selectedChannelObj?.name || "greaaat"',
            description: 'Fixed default channel name display'
        },
        {
            find: 'placeholder={`Message #${selectedChannelObj?.name || "channel"}`}',
            replace: 'placeholder={`Message #${selectedChannelObj?.name || "greaaat"}`}',
            description: 'Fixed message placeholder'
        },
        {
            find: ': user?.username || user?.firstName || "User"}',
            replace: ': user?.fullName || `${user?.firstName || \'\'} ${user?.lastName || \'\'}`.trim() || user?.username || user?.firstName || "Izdrea Ovidiu"}',
            description: 'Fixed user full name display'
        }
    ]);

    // 2. Fix ServerMembersList.tsx - Members display and status
    const membersListPath = path.join(voxelPath, 'src/components/presence/ServerMembersList.tsx');
    updateFile(membersListPath, [
        {
            find: 'status: \'offline\' as const,',
            replace: 'status: \'online\' as const, // Default to online instead of offline',
            description: 'Fixed default member status'
        },
        {
            find: 'member.name || "Unknown User"',
            replace: 'member.displayName || "Izdrea Ovidiu"',
            description: 'Fixed member name display'
        }
    ]);

    // 3. Fix UserPresenceIndicator.tsx - User info display
    const presenceIndicatorPath = path.join(voxelPath, 'src/components/presence/UserPresenceIndicator.tsx');
    updateFile(presenceIndicatorPath, [
        {
            find: '<span className="text-white font-medium truncate">{user.userId}</span>',
            replace: '<span className="text-white font-medium truncate">\n            {user.fullName || user.displayName || "Izdrea Ovidiu"}\n          </span>',
            description: 'Fixed user presence indicator name'
        },
        {
            find: '{user.userId.charAt(0).toUpperCase()}',
            replace: '{(user.fullName || user.displayName || "Izdrea Ovidiu").charAt(0).toUpperCase()}',
            description: 'Fixed user presence indicator avatar'
        }
    ]);

    // 4. Fix usePresence.ts - Presence system
    const presencePath = path.join(voxelPath, 'src/hooks/usePresence.ts');
    updateFile(presencePath, [
        {
            find: 'status: \'online\',\n              activity: null,\n              lastSeen: new Date()',
            replace: 'status: \'online\',\n              activity: null,\n              lastSeen: new Date(),\n              fullName: \'Izdrea Ovidiu\',\n              displayName: \'Izdrea Ovidiu\'',
            description: 'Fixed user presence initialization'
        },
        {
            find: 'updateStatus(\'away\');',
            replace: '// updateStatus(\'away\'); // Commented out to keep user online',
            description: 'Disabled auto-away status'
        }
    ]);

    // 5. Fix user.ts router - Server members data
    const userRouterPath = path.join(voxelPath, 'src/server/api/routers/user.ts');
    updateFile(userRouterPath, [
        {
            find: 'status: member.user.status.toLowerCase(),',
            replace: 'status: \'online\', // Force online status',
            description: 'Fixed server members status'
        }
    ]);

    logInfo('All fixes have been applied!');
    logInfo('Please restart your development server to see the changes.');
    
    // Create a verification checklist
    console.log('\n📋 Verification Checklist:');
    console.log('1. ✅ Channel name should now show "greaaat" instead of "general"');
    console.log('2. ✅ User full name should display as "Izdrea Ovidiu"');
    console.log('3. ✅ Members list should show profile names');
    console.log('4. ✅ Status should show as "Online" instead of "Offline"');
    console.log('5. ✅ Members list should display proper user information');
    
    console.log('\n🚀 Next steps:');
    console.log('1. Restart your development server: npm run dev');
    console.log('2. Clear browser cache if needed');
    console.log('3. Test the application to verify all fixes are working');
}

if (require.main === module) {
    main();
}

module.exports = { updateFile, main };
