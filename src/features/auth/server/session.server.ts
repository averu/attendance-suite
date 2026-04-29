import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '@/shared/lib/db.server'
import { memberships, organizations } from '@/db/schema'
import { auth } from './auth.server'
import type { AuthState } from '../types'

export type { AuthState } from '../types'

export const getSessionHandler = async (): Promise<AuthState> => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return {
      user: null,
      membership: null,
      organization: null,
      availableOrganizations: [],
    }
  }
  const rows = await db
    .select({
      m: memberships,
      o: organizations,
    })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(eq(memberships.userId, session.user.id))
    .limit(1)
  const row = rows[0]
  return {
    user: { id: session.user.id, email: session.user.email, name: session.user.name },
    membership: row
      ? {
          id: row.m.id,
          organizationId: row.m.organizationId,
          role: row.m.role as 'member' | 'admin' | 'owner',
        }
      : null,
    organization: row
      ? {
          id: row.o.id,
          name: row.o.name,
          slug: row.o.slug,
          timezone: row.o.timezone,
          dailyScheduledMinutes: row.o.dailyScheduledMinutes,
          weeklyScheduledMinutes: row.o.weeklyScheduledMinutes,
          legalHolidayDow: row.o.legalHolidayDow,
        }
      : null,
    // この legacy handler は使われていないが型整合のため空配列
    availableOrganizations: [],
  }
}

// signOut は authClient.signOut() (HTTP) を使うので server fn は不要。
// 必要なら handler だけ残しておく。
export const signOutHandler = async (): Promise<{ ok: true }> => {
  const request = getRequest()
  await auth.api.signOut({ headers: request.headers })
  return { ok: true }
}
