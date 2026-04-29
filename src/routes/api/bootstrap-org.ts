import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
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
// 許可条件:
//   (a) membership が 0 件 = signup 直後 (新規ユーザの初回作成)
//   (b) どこかの組織で owner ロールを持っている (multi-org の追加作成)
// それ以外 (= member/admin としてのみ所属している) は member の権限濫用を防ぐため拒否。
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

        const userId = session.user.id

        // 既存 membership を確認: 0 件なら signup として許可、
        // 1 件以上なら owner ロールがどこかにあるかチェックして許可判定。
        const existing = await db
          .select({ role: memberships.role })
          .from(memberships)
          .where(eq(memberships.userId, userId))
        if (existing.length > 0) {
          const isOwnerSomewhere = existing.some((m) => m.role === 'owner')
          if (!isOwnerSomewhere) {
            return Response.json(
              { error: 'FORBIDDEN_NOT_OWNER' },
              { status: 403 },
            )
          }
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
