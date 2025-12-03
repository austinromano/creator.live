const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // First show users with wallets
  const users = await prisma.user.findMany({
    where: { walletAddress: { not: null } },
    select: { id: true, username: true, walletAddress: true, hasCompletedOnboarding: true }
  });
  console.log('Users with wallet addresses:');
  console.log(JSON.stringify(users, null, 2));

  // Delete them
  if (users.length > 0) {
    // First delete related streams
    for (const user of users) {
      await prisma.stream.deleteMany({ where: { userId: user.id } });
      console.log('Deleted streams for user:', user.id);
    }

    // Then delete users
    const deleted = await prisma.user.deleteMany({
      where: { walletAddress: { not: null } }
    });
    console.log('Deleted', deleted.count, 'users with wallet addresses');
  } else {
    console.log('No users with wallet addresses found');
  }
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
