import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller } from '@/shared/server/apiAuth'
import { listMyCorrectionRequestsHandler } from '@/features/correction-request/server/handlers.server'

export const Route = createFileRoute('/api/correction-requests/list-mine')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const items = await listMyCorrectionRequestsHandler(r.ctx)
        return Response.json({ items })
      },
    },
  },
})
