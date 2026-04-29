import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireAdmin } from '@/shared/server/apiAuth'
import { listMemberLeaveGrantsHandler } from '@/features/leave-request/server/handlers.server'

// GET /api/admin/leave-grants/list?userId=...
export const Route = createFileRoute('/api/admin/leave-grants/list')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireAdmin(r.ctx)
        if (guard) return guard
        const url = new URL(request.url)
        const userId = url.searchParams.get('userId')
        if (!userId) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        const items = await listMemberLeaveGrantsHandler(r.ctx, userId)
        return Response.json({ items })
      },
    },
  },
})
