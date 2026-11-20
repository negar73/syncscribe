import { PrismaClient } from '@prisma/client'

/**
 * Prisma client singleton.
 *
 * Next.js hot-reloads modules in development; without the global cache each
 * reload would spawn another connection pool until the database refuses
 * connections. The same module is also imported by the standalone WebSocket
 * server (server/ws-server.ts).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
