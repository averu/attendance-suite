import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { serverEnv } from '@/shared/config/env.server'
import * as schema from '@/db/schema'

let pool: Pool | undefined

function getPool(): Pool {
  if (!pool) {
    const env = serverEnv()
    pool = new Pool({ connectionString: env.DATABASE_URL })
  }
  return pool
}

export const db = drizzle(getPool(), { schema })
export type DB = typeof db
