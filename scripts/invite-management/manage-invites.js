#!/usr/bin/env node

/**
 * Invite Management Script
 * Usage: node scripts/invite-management/manage-invites.js [command] [options]
 * 
 * Commands:
 *   list - List all invites
 *   create - Create a new invite
 *   check - Check if an invite exists
 *   cleanup - Remove expired invites
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listInvites() {
  console.log('📋 Listing all server invites...\n');
  
  const invites = await prisma.serverInvite.findMany({
    include: {
      server: {
        select: {
          name: true,
          ownerId: true
        }
      },
      creator: {
        select: {
          username: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (invites.length === 0) {
    console.log('❌ No invites found in database');
    return;
  }

  console.log(`Found ${invites.length} invite(s):\n`);
  
  invites.forEach((invite, index) => {
    const isExpired = invite.expiresAt && invite.expiresAt < new Date();
    const isUsedUp = invite.maxUses && invite.uses >= invite.maxUses;
    const status = isExpired ? '⏰ EXPIRED' : isUsedUp ? '🔒 MAX USES' : '✅ ACTIVE';
    
    console.log(`${index + 1}. ${status}`);
    console.log(`   Code: ${invite.code}`);
    console.log(`   Server: ${invite.server.name}`);
    console.log(`   Creator: ${invite.creator.username} (${invite.creator.email})`);
    console.log(`   Uses: ${invite.uses}${invite.maxUses ? `/${invite.maxUses}` : '/∞'}`);
    console.log(`   Created: ${invite.createdAt.toISOString()}`);
    console.log(`   Expires: ${invite.expiresAt ? invite.expiresAt.toISOString() : 'Never'}`);
    console.log(`   URL: http://localhost:3000/invite/${invite.code}\n`);
  });
}

async function checkInvite(code) {
  console.log(`🔍 Checking invite: ${code}\n`);
  
  const invite = await prisma.serverInvite.findUnique({
    where: { code },
    include: {
      server: {
        select: {
          name: true,
          description: true,
          _count: {
            select: {
              members: true
            }
          }
        }
      },
      creator: {
        select: {
          username: true
        }
      }
    }
  });

  if (!invite) {
    console.log('❌ Invite not found!');
    console.log('This could be why you\'re seeing "Invite Not Found" error.');
    return false;
  }

  const isExpired = invite.expiresAt && invite.expiresAt < new Date();
  const isUsedUp = invite.maxUses && invite.uses >= invite.maxUses;
  
  console.log('✅ Invite found!');
  console.log(`   Code: ${invite.code}`);
  console.log(`   Server: ${invite.server.name}`);
  console.log(`   Description: ${invite.server.description || 'No description'}`);
  console.log(`   Members: ${invite.server._count.members}`);
  console.log(`   Creator: ${invite.creator.username}`);
  console.log(`   Uses: ${invite.uses}${invite.maxUses ? `/${invite.maxUses}` : '/∞'}`);
  console.log(`   Status: ${isExpired ? '⏰ EXPIRED' : isUsedUp ? '🔒 MAX USES' : '✅ ACTIVE'}`);
  console.log(`   Created: ${invite.createdAt.toISOString()}`);
  console.log(`   Expires: ${invite.expiresAt ? invite.expiresAt.toISOString() : 'Never'}`);
  
  if (isExpired) {
    console.log('\n⚠️  This invite has expired!');
  } else if (isUsedUp) {
    console.log('\n⚠️  This invite has reached maximum uses!');
  } else {
    console.log('\n🎉 This invite is valid and can be used!');
  }
  
  return !isExpired && !isUsedUp;
}

async function createTestInvite() {
  console.log('🔨 Creating test invite...\n');
  
  // Find the first server
  const server = await prisma.server.findFirst({
    include: {
      owner: true
    }
  });
  
  if (!server) {
    console.log('❌ No servers found! Create a server first.');
    return;
  }
  
  // Generate a simple, memorable code
  const code = 'test-invite-' + Math.random().toString(36).substring(2, 8);
  
  const invite = await prisma.serverInvite.create({
    data: {
      code,
      serverId: server.id,
      createdBy: server.ownerId,
      maxUses: null, // Unlimited uses
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    }
  });
  
  console.log('✅ Test invite created successfully!');
  console.log(`   Code: ${invite.code}`);
  console.log(`   Server: ${server.name}`);
  console.log(`   URL: http://localhost:3000/invite/${invite.code}`);
  console.log(`   Expires: ${invite.expiresAt.toISOString()}`);
  console.log('\n🎉 You can now test this invite URL!');
  
  return invite;
}

async function createSpecificInvite(code) {
  console.log(`🔨 Creating invite with code: ${code}\n`);
  
  // Find the first server
  const server = await prisma.server.findFirst({
    include: {
      owner: true
    }
  });
  
  if (!server) {
    console.log('❌ No servers found! Create a server first.');
    return;
  }
  
  // Check if code already exists
  const existing = await prisma.serverInvite.findUnique({
    where: { code }
  });
  
  if (existing) {
    console.log('⚠️  Invite with this code already exists!');
    return existing;
  }
  
  const invite = await prisma.serverInvite.create({
    data: {
      code,
      serverId: server.id,
      createdBy: server.ownerId,
      maxUses: null, // Unlimited uses
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    }
  });
  
  console.log('✅ Invite created successfully!');
  console.log(`   Code: ${invite.code}`);
  console.log(`   Server: ${server.name}`);
  console.log(`   URL: http://localhost:3000/invite/${invite.code}`);
  console.log(`   Expires: ${invite.expiresAt.toISOString()}`);
  
  return invite;
}

async function cleanupExpiredInvites() {
  console.log('🧹 Cleaning up expired invites...\n');
  
  const expiredInvites = await prisma.serverInvite.findMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  });
  
  if (expiredInvites.length === 0) {
    console.log('✅ No expired invites found');
    return;
  }
  
  console.log(`Found ${expiredInvites.length} expired invite(s):`);
  expiredInvites.forEach(invite => {
    console.log(`   - ${invite.code} (expired: ${invite.expiresAt.toISOString()})`);
  });
  
  const result = await prisma.serverInvite.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  });
  
  console.log(`\n🗑️  Deleted ${result.count} expired invite(s)`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const param = args[1];
  
  console.log('🎮 Voxel Invite Management Tool\n');
  
  try {
    switch (command) {
      case 'list':
        await listInvites();
        break;
        
      case 'check':
        if (!param) {
          console.log('❌ Please provide an invite code to check');
          console.log('Usage: node manage-invites.js check <invite-code>');
          break;
        }
        await checkInvite(param);
        break;
        
      case 'create':
        if (param) {
          await createSpecificInvite(param);
        } else {
          await createTestInvite();
        }
        break;
        
      case 'cleanup':
        await cleanupExpiredInvites();
        break;
        
      case 'fix-missing':
        // Special command to fix the specific missing invite
        console.log('🔧 Fixing missing invite: 7p9lxt4i31e\n');
        await createSpecificInvite('7p9lxt4i31e');
        break;
        
      default:
        console.log('Available commands:');
        console.log('  list                    - List all invites');
        console.log('  check <code>           - Check if invite exists');
        console.log('  create [code]          - Create new invite (with optional code)');
        console.log('  cleanup                - Remove expired invites');
        console.log('  fix-missing            - Fix the missing 7p9lxt4i31e invite');
        console.log('\nExamples:');
        console.log('  node manage-invites.js list');
        console.log('  node manage-invites.js check 7p9lxt4i31e');
        console.log('  node manage-invites.js create');
        console.log('  node manage-invites.js create my-custom-code');
        console.log('  node manage-invites.js fix-missing');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nPossible solutions:');
    console.log('1. Make sure the database is running');
    console.log('2. Check your DATABASE_URL in .env');
    console.log('3. Run: npx prisma generate');
    console.log('4. Run: npx prisma db push');
  } finally {
    await prisma.$disconnect();
  }
}

main();
