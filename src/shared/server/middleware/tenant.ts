import { createMiddleware } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '@/shared/lib/db.server'
import { memberships } from '@/db/schema'
import { ForbiddenError } from '@/shared/lib/errors'
import { authMiddleware } from './auth'

export type Role = 'member' | 'admin' | 'owner'

/**
 * authMiddleware の後に置く。session の user から membership (org + role) を解決し
 * context.membership を注入。組織未所属は ForbiddenError。
 */
export const tenantMiddleware = createMiddleware({ type: 'function' })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    const rows = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, context.user.id))
      .limit(1)
    const m = rows[0]
    if (!m) {
      throw new ForbiddenError('NO_MEMBERSHIP')
    }
    return next({
      context: {
        membership: {
          id: m.id,
          organizationId: m.organizationId,
          userId: m.userId,
          role: m.role as Role,
        },
      },
    })
  })
