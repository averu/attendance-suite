import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireAdmin } from '@/shared/server/apiAuth'
import { getOrgRecentTrendHandler } from '@/features/admin-overview/server/handlers.server'

export const Route = createFileRoute('/api/admin/recent-trend')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireAdmin(r.ctx)
        if (guard) return guard
        const url = new URL(request.url)
        const daysParam = url.searchParams.get('days')
        const days = daysParam ? Math.min(31, Math.max(1, parseInt(daysParam, 10))) : 7
        const result = await getOrgRecentTrendHandler(r.ctx, days)
        return Response.json(result)
      },
    },
  },
})
