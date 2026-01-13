/**
 * Prisma Client
 * Singleton instance with connection pooling for Neon PostgreSQL
 */

import { PrismaClient } from '@prisma/client'
import { createLogger } from './logger.js'

const logger = createLogger('prisma')

// =============================================================================
// PRISMA CLIENT CONFIGURATION
// =============================================================================

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

const prismaClientSingleton = (): PrismaClient => {
  return new PrismaClient({
    log: [
      {
        emit: 'event',
        level: 'query'
      },
      {
        emit: 'event',
        level: 'error'
      },
      {
        emit: 'event',
        level: 'warn'
      }
    ],
    
    // Connection pool settings for Neon
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

// Use global variable in development to prevent multiple instances during hot reload
export const prisma = globalThis.__prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

// =============================================================================
// LOGGING SETUP
// =============================================================================

// Query logging in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query' as never, (e: { query: string; params: string; duration: number }) => {
    logger.debug({
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`
    }, 'Database query')
  })
}

// Error logging
prisma.$on('error' as never, (e: { message: string }) => {
  logger.error({ error: e.message }, 'Database error')
})

// Warning logging
prisma.$on('warn' as never, (e: { message: string }) => {
  logger.warn({ warning: e.message }, 'Database warning')
})

// =============================================================================
// CONNECTION MANAGEMENT
// =============================================================================

/**
 * Connect to database
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect()
    logger.info('Database connected')
  } catch (error) {
    logger.fatal({ error }, 'Failed to connect to database')
    throw error
  }
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect()
    logger.info('Database disconnected')
  } catch (error) {
    logger.error({ error }, 'Error disconnecting from database')
  }
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean
  latency?: number
  error?: string
}> {
  const start = Date.now()
  
  try {
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - start
    
    return {
      healthy: true,
      latency
    }
  } catch (error) {
    logger.error({ error }, 'Database health check failed')
    
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// =============================================================================
// TRANSACTION HELPER
// =============================================================================

/**
 * Execute operations in a transaction
 */
export async function withTransaction<T>(
  fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return fn(tx)
  }, {
    maxWait: 5000, // 5s max wait to start transaction
    timeout: 10000 // 10s max transaction duration
  })
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

// Handle shutdown signals
const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'Shutting down database connection')
  await disconnectDatabase()
}

process.on('beforeExit', () => shutdown('beforeExit'))

export default prisma
