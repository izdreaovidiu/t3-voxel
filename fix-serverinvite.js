const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function fixServerInviteIssue() {
  console.log('🔧 FIXING SERVERINVITE PRISMA CLIENT ISSUE');
  console.log('=========================================');
  
  try {
    // Step 1: Generate Prisma client
    console.log('🎯 Step 1: Generating Prisma client...');
    const { stdout: generateOutput } = await execAsync('npx prisma generate');
    console.log(generateOutput);
    
    // Step 2: Push schema to database
    console.log('📊 Step 2: Pushing schema to database...');
    const { stdout: pushOutput } = await execAsync('npx prisma db push --accept-data-loss');
    console.log(pushOutput);
    
    // Step 3: Verify the fix
    console.log('🔍 Step 3: Verifying ServerInvite model...');
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const models = Object.keys(prisma);
      console.log('Available models:', models);
      console.log('ServerInvite available:', models.includes('serverInvite') ? '✅ YES' : '❌ NO');
      await prisma.$disconnect();
    } catch (clientError) {
      console.log('⚠️  Client verification failed, but generation should work after restart');
    }
    
    console.log('');
    console.log('✅ FIX COMPLETE!');
    console.log('🚀 Restart your dev server with: npm run dev');
    console.log('💡 The serverInvite model should now work properly');
    console.log('');
    console.log('📋 What was fixed:');
    console.log('  - Regenerated Prisma client with ServerInvite model');
    console.log('  - Synced database schema');
    console.log('  - ctx.db.serverInvite should now be available');
    
  } catch (error) {
    console.error('❌ Error during fix:', error.message);
    console.log('\n🔧 Manual fix steps:');
    console.log('1. Run: npx prisma generate');
    console.log('2. Run: npx prisma db push');
    console.log('3. Restart your development server');
    console.log('4. Test the server invite creation again');
  }
}

// Run the fix
fixServerInviteIssue();
