const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { nanoid } = require('nanoid');
require('dotenv').config({ path: '.env.local' });

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Prisma adapter and client
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// AI Streamers - these will always be "live" on the platform
const AI_STREAMERS = [
  {
    id: 'ai-luna-rivers',
    username: 'Luna Rivers',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=luna&backgroundColor=b6e3f4',
    bio: 'AI music streamer playing chill beats 24/7',
    streamTitle: "Luna's Chill Lounge",
  },
  {
    id: 'ai-pixel-princess',
    username: 'Pixel Princess',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pixel&backgroundColor=c0aede',
    bio: 'Retro gaming AI streamer',
    streamTitle: 'Retro Gaming Marathon',
  },
  {
    id: 'ai-fitness-max',
    username: 'Fitness Guru Max',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=max&backgroundColor=ffdfbf',
    bio: 'AI fitness instructor streaming workouts',
    streamTitle: '24/7 Workout Sessions',
  },
  {
    id: 'ai-goth-queen',
    username: 'Goth Queen',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=goth&backgroundColor=d1d4f9',
    bio: 'Dark aesthetic AI streamer',
    streamTitle: 'Midnight Vibes',
  },
];

async function seedAIStreamers() {
  console.log('Seeding AI streamers...\n');

  for (const streamer of AI_STREAMERS) {
    try {
      // Create or update the AI user
      const user = await prisma.user.upsert({
        where: { id: streamer.id },
        update: {
          username: streamer.username,
          avatar: streamer.avatar,
          bio: streamer.bio,
          isAI: true,
          hasCompletedOnboarding: true,
        },
        create: {
          id: streamer.id,
          username: streamer.username,
          avatar: streamer.avatar,
          bio: streamer.bio,
          isAI: true,
          hasCompletedOnboarding: true,
        },
      });

      console.log(`✅ Created/updated AI user: ${user.username} (${user.id})`);

      // Check if there's already a live stream for this user
      const existingStream = await prisma.stream.findFirst({
        where: {
          userId: user.id,
          isLive: true,
        },
      });

      if (existingStream) {
        console.log(`   Stream already exists: ${existingStream.title}`);
      } else {
        // Create a permanent live stream for this AI user
        const stream = await prisma.stream.create({
          data: {
            userId: user.id,
            streamKey: nanoid(32),
            title: streamer.streamTitle,
            isLive: true,
            startedAt: new Date(),
            viewerCount: Math.floor(Math.random() * 500) + 100, // Random viewers 100-600
          },
        });

        console.log(`   Created stream: ${stream.title}`);
      }

      console.log(`   Room name: user-${user.id}\n`);
    } catch (error) {
      console.error(`❌ Error seeding ${streamer.username}:`, error.message);
    }
  }

  console.log('\nAI streamers seeding complete!');
  console.log('These users will always appear as live on the platform.');
}

seedAIStreamers()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
