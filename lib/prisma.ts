import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// PrismaClient singleton to prevent multiple instances in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Create PostgreSQL connection pool with settings for Supabase pooler
const pool = globalForPrisma.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5, // Allow concurrent connections for better throughput
  min: 1, // Keep at least one connection ready
  idleTimeoutMillis: 30000, // 30 seconds idle before closing
  connectionTimeoutMillis: 30000, // Longer timeout for cold starts
  keepAlive: true, // Enable keepalive for connection reuse
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
