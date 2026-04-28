import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/shared/lib/db.server'
import { organizations, memberships } from '@/db/schema'
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

// POST /api/bootstrap-org — サインアップ直後に呼ぶ。
// session の user に新しい organization と owner membership を作る。
// 既に membership がある場合はエラー (1 user = 1 org の MVP 制約)。
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

        const existing = await db
          .select()
          .from(memberships)
          .where(eq(memberships.userId, session.user.id))
          .limit(1)
        if (existing.length > 0) {
          return Response.json({ error: 'ALREADY_MEMBER' }, { status: 400 })
        }

        const slug = `${slugify(parsed.data.name)}-${Date.now().toString(36)}`
        const result = await db.transaction(async (tx) => {
          const [org] = await tx
            .insert(organizations)
            .values({
              name: parsed.data.name,
              slug,
              timezone: 'Asia/Tokyo',
            })
            .returning()
          if (!org) {
            throw new Error('organization insert failed')
          }
          await tx.insert(memberships).values({
            organizationId: org.id,
            userId: session.user.id,
            role: 'owner',
          })
          return org
        })

        return Response.json({ ok: true, organizationId: result.id })
      },
    },
  },
})
