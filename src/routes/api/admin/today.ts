import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireAdmin } from '@/shared/server/apiAuth'
import { getOrgTodayStatusHandler } from '@/features/admin-overview/server/handlers.server'

export const Route = createFileRoute('/api/admin/today')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireAdmin(r.ctx)
        if (guard) return guard
        const result = await getOrgTodayStatusHandler(r.ctx)
        return Response.json(result)
      },
    },
  },
})
