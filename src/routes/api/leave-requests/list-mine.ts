import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller } from '@/shared/server/apiAuth'
import { listMyLeaveRequestsHandler } from '@/features/leave-request/server/handlers.server'

export const Route = createFileRoute('/api/leave-requests/list-mine')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const items = await listMyLeaveRequestsHandler(r.ctx)
        return Response.json({ items })
      },
    },
  },
})
