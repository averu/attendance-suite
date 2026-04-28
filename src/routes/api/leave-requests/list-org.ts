import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireAdmin } from '@/shared/server/apiAuth'
import { listOrgLeaveRequestsHandler } from '@/features/leave-request/server/handlers.server'

export const Route = createFileRoute('/api/leave-requests/list-org')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireAdmin(r.ctx)
        if (guard) return guard
        const url = new URL(request.url)
        const items = await listOrgLeaveRequestsHandler(r.ctx, {
          status: url.searchParams.get('status') ?? undefined,
          userId: url.searchParams.get('userId') ?? undefined,
        })
        return Response.json({ items })
      },
    },
  },
})
