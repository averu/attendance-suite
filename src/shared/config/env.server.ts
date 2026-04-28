import { createServerOnlyFn } from '@tanstack/react-start'
import { z } from 'zod'

const ServerEnv = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32, 'must be at least 32 chars'),
  BETTER_AUTH_URL: z.string().url(),
})

export type ServerEnv = z.infer<typeof ServerEnv>

export const serverEnv = createServerOnlyFn((): ServerEnv => ServerEnv.parse(process.env))
