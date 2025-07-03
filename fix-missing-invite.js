// Direct fix script for the missing invite issue
// Run with: node fix-missing-invite.js

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function fixMissingInvite() {
  console.log('🔧 Fixing missing invite: 7p9lxt4i31e');
  console.log('================================');
  console.log('');

  try {
    // Check if invite already exists
    console.log('🔍 Checking if invite already exists...');
    const existingInvite = await prisma.serverInvite.findUnique({
      where: { code: '7p9lxt4i31e' }
    });

    if (existingInvite) {
      console.log('✅ Invite already exists!');
      console.log(`   Server ID: ${existingInvite.serverId}`);
      console.log(`   Uses: ${existingInvite.uses}${existingInvite.maxUses ? `/${existingInvite.maxUses}` : '/∞'}`);
      console.log(`   Expires: ${existingInvite.expiresAt ? existingInvite.expiresAt.toISOString() : 'Never'}`);
      console.log(`   URL: http://localhost:3000/invite/${existingInvite.code}`);
      return;
    }

    // Find the first server to attach the invite to
    console.log('🔍 Looking for servers...');
    const server = await prisma.server.findFirst({
      include: {
        owner: {
          select: {
            id: true,
            username: true
          }
        },
        _count: {
          select: {
            members: true
          }
        }
      }
    });

    if (!server) {
      console.log('❌ No servers found!');
      console.log('');
      console.log('💡 Solutions:');
      console.log('1. Create a server first in your app');
      console.log('2. Or run this after creating at least one server');
      return;
    }

    console.log('✅ Found server to use:');
    console.log(`   Name: ${server.name}`);
    console.log(`   Owner: ${server.owner.username}`);
    console.log(`   Members: ${server._count.members}`);
    console.log('');

    // Create the missing invite
    console.log('💾 Creating missing invite...');
    const invite = await prisma.serverInvite.create({
      data: {
        code: '7p9lxt4i31e',
        serverId: server.id,
        createdBy: server.ownerId,
        maxUses: null, // Unlimited uses
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }
    });

    console.log('✅ Invite created successfully!');
    console.log(`   Code: ${invite.code}`);
    console.log(`   Server: ${server.name}`);
    console.log(`   Expires: ${invite.expiresAt.toISOString()}`);
    console.log(`   URL: http://localhost:3000/invite/${invite.code}`);
    console.log('');
    console.log('🎉 Your invite should now work!');
    console.log('   Test it by visiting: http://localhost:3000/invite/7p9lxt4i31e');

  } catch (error) {
    console.error('❌ Error fixing invite:', error.message);
    console.log('');
    console.log('💡 Possible solutions:');
    console.log('1. Make sure your database is running');
    console.log('2. Check your DATABASE_URL in .env file');
    console.log('3. Run: npx prisma generate');
    console.log('4. Run: npx prisma db push');
    console.log('');
    console.log('🔍 Error details:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function listAllInvites() {
  console.log('📋 Current invites in database:');
  console.log('==============================');
  console.log('');

  try {
    const invites = await prisma.serverInvite.findMany({
      include: {
        server: {
          select: {
            name: true
          }
        },
        creator: {
          select: {
            username: true
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

    invites.forEach((invite, index) => {
      const isExpired = invite.expiresAt && invite.expiresAt < new Date();
      const isUsedUp = invite.maxUses && invite.uses >= invite.maxUses;
      const status = isExpired ? '⏰ EXPIRED' : isUsedUp ? '🔒 USED UP' : '✅ ACTIVE';
      
      console.log(`${index + 1}. ${status}`);
      console.log(`   Code: ${invite.code}`);
      console.log(`   Server: ${invite.server.name}`);
      console.log(`   Creator: ${invite.creator.username}`);
      console.log(`   Uses: ${invite.uses}${invite.maxUses ? `/${invite.maxUses}` : '/∞'}`);
      console.log(`   URL: http://localhost:3000/invite/${invite.code}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error listing invites:', error.message);
  }
}

async function main() {
  const command = process.argv[2];

  if (command === 'list') {
    await listAllInvites();
  } else {
    await fixMissingInvite();
  }
}

// Run the script
main().catch(console.error);
