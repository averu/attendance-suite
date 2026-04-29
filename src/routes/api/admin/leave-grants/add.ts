import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireAdmin } from '@/shared/server/apiAuth'
import { addLeaveGrantHandler } from '@/features/leave-request/server/handlers.server'
import { AddLeaveGrantInputSchema } from '@/features/leave-request/schemas'

// POST /api/admin/leave-grants/add — admin が手動で有給付与を登録 (繰越や初期設定用)
export const Route = createFileRoute('/api/admin/leave-grants/add')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireAdmin(r.ctx)
        if (guard) return guard
        const body = await request.json().catch(() => ({}))
        const parsed = AddLeaveGrantInputSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        try {
          const result = await addLeaveGrantHandler(r.ctx, parsed.data)
          return Response.json(result)
        } catch (e) {
          const code = (e as { code?: string }).code ?? 'BAD_REQUEST'
          return Response.json({ error: code }, { status: 400 })
        }
      },
    },
  },
})
