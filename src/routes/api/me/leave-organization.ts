import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/shared/lib/db.server'
import { memberships, userPreferences } from '@/db/schema'
import { auth } from '@/features/auth/server/auth.server'
import { canLeaveOrganization } from '@/features/organization'

const Input = z.object({
  organizationId: z.string().uuid(),
})

// POST /api/me/leave-organization — 自分が active かどうかに関わらず指定 org から脱退。
// 唯一の owner なら拒否 (LAST_OWNER)。
export const Route = createFileRoute('/api/me/leave-organization')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session?.user) {
          return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })
        }
        const body = await request.json().catch(() => ({}))
        const parsed = Input.safeParse(body)
        if (!parsed.success) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        const userId = session.user.id
        const orgId = parsed.data.organizationId

        // 対象組織の全メンバー
        const orgMembers = await db
          .select({ userId: memberships.userId, role: memberships.role })
          .from(memberships)
          .where(eq(memberships.organizationId, orgId))

        const check = canLeaveOrganization(orgMembers, userId)
        if (!check.ok) {
          return Response.json({ error: check.code }, { status: 400 })
        }

        await db.transaction(async (tx) => {
          await tx
            .delete(memberships)
            .where(
              and(
                eq(memberships.userId, userId),
                eq(memberships.organizationId, orgId),
              ),
            )
          // active org が脱退対象なら null に戻す (resolveCaller が次回フォールバック)
          await tx
            .update(userPreferences)
            .set({ activeOrganizationId: null, updatedAt: sql`now()` })
            .where(
              and(
                eq(userPreferences.userId, userId),
                eq(userPreferences.activeOrganizationId, orgId),
              ),
            )
        })

        return Response.json({ ok: true })
      },
    },
  },
})
