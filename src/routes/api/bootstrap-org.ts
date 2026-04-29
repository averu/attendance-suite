import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { sql } from 'drizzle-orm'
import { db } from '@/shared/lib/db.server'
import {
  organizations,
  memberships,
  userPreferences,
} from '@/db/schema'
import { auth } from '@/features/auth/server/auth.server'

const Input = z.object({
  name: z.string().min(1).max(100),
})

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'org'
  )
}

// POST /api/bootstrap-org — 新しい組織を作って自分を owner として加入。
// signup 直後にも呼ばれるし、追加組織作成 (multi-org) でも呼ばれる。
// 作成後は active organization を新組織に切り替える。
export const Route = createFileRoute('/api/bootstrap-org')({
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

        const slug = `${slugify(parsed.data.name)}-${Date.now().toString(36)}`
        const userId = session.user.id
        const result = await db.transaction(async (tx) => {
          const [org] = await tx
            .insert(organizations)
            .values({
              name: parsed.data.name,
              slug,
              timezone: 'Asia/Tokyo',
            })
            .returning()
          if (!org) throw new Error('organization insert failed')
          await tx.insert(memberships).values({
            organizationId: org.id,
            userId,
            role: 'owner',
          })
          // active organization を新組織にセット
          await tx
            .insert(userPreferences)
            .values({ userId, activeOrganizationId: org.id })
            .onConflictDoUpdate({
              target: userPreferences.userId,
              set: {
                activeOrganizationId: org.id,
                updatedAt: sql`now()`,
              },
            })
          return org
        })

        return Response.json({ ok: true, organizationId: result.id })
      },
    },
  },
})
