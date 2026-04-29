import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireAdmin } from '@/shared/server/apiAuth'
import { updateMemberWorkProfileHandler } from '@/features/organization/server/handlers.server'
import { UpdateMemberWorkProfileInputSchema } from '@/features/organization/schemas'

// POST /api/organization/update-member-work-profile
// admin / owner が任意メンバーの労務情報 (雇入日・週所定) を更新する。
export const Route = createFileRoute(
  '/api/organization/update-member-work-profile',
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireAdmin(r.ctx)
        if (guard) return guard
        const body = await request.json().catch(() => ({}))
        const parsed = UpdateMemberWorkProfileInputSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        try {
          const result = await updateMemberWorkProfileHandler(r.ctx, parsed.data)
          return Response.json(result)
        } catch (e) {
          const code = (e as { code?: string }).code ?? 'BAD_REQUEST'
          return Response.json({ error: code }, { status: 400 })
        }
      },
    },
  },
})
