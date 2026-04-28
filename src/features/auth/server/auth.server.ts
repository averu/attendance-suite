import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '@/shared/lib/db.server'
import { serverEnv } from '@/shared/config/env.server'
import { users, sessions, accounts, verifications } from '@/db/schema'

const env = serverEnv()

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user: users, session: sessions, account: accounts, verification: verifications },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  // tanstackStartCookies は配列の最後 (CLAUDE.md ルール)
  plugins: [tanstackStartCookies()],
})

export type Auth = typeof auth
