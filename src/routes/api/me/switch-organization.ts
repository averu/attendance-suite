import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/shared/lib/db.server'
import { memberships, userPreferences } from '@/db/schema'
import { auth } from '@/features/auth/server/auth.server'

const Input = z.object({
  organizationId: z.string().uuid(),
})

// POST /api/me/switch-organization — active organization を切替。
// caller が指定 org に membership を持っているか検証する。
export const Route = createFileRoute('/api/me/switch-organization')({
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
        // DB 側で絞って 1 行だけ確認 (全件 fetch を回避)
        const memberRows = await db
          .select()
          .from(memberships)
          .where(
            and(
              eq(memberships.userId, session.user.id),
              eq(memberships.organizationId, parsed.data.organizationId),
            ),
          )
          .limit(1)
        if (memberRows.length === 0) {
          return Response.json({ error: 'NO_MEMBERSHIP' }, { status: 403 })
        }
        // upsert preference
        await db
          .insert(userPreferences)
          .values({
            userId: session.user.id,
            activeOrganizationId: parsed.data.organizationId,
          })
          .onConflictDoUpdate({
            target: userPreferences.userId,
            set: {
              activeOrganizationId: parsed.data.organizationId,
              updatedAt: sql`now()`,
            },
          })
        return Response.json({ ok: true })
      },
    },
  },
})
