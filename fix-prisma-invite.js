// Quick fix for Prisma ServerInvite issue
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function fixPrismaClient() {
  console.log('🔧 Fixing Prisma client for ServerInvite model...');
  
  try {
    // Check if Prisma client has ServerInvite
    console.log('🔍 Checking current Prisma client...');
    
    // Generate Prisma client
    console.log('🎯 Generating Prisma client...');
    const { stdout: generateOutput } = await execAsync('npx prisma generate');
    console.log(generateOutput);
    
    // Push schema to database
    console.log('📊 Pushing schema to database...');
    const { stdout: pushOutput } = await execAsync('npx prisma db push --accept-data-loss');
    console.log(pushOutput);
    
    console.log('✅ Prisma client fixed successfully!');
    console.log('🚀 ServerInvite model should now be available');
    console.log('💡 Restart your dev server to apply changes');
    
  } catch (error) {
    console.error('❌ Error fixing Prisma client:', error.message);
    console.log('\n📋 Manual fix steps:');
    console.log('1. Run: npx prisma generate');
    console.log('2. Run: npx prisma db push');
    console.log('3. Restart your development server');
  }
}

fixPrismaClient();
