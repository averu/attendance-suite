import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireAdmin } from '@/shared/server/apiAuth'
import { getOrgMonthlySummaryHandler } from '@/features/summary/server/handlers.server'

export const Route = createFileRoute('/api/summary/monthly')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireAdmin(r.ctx)
        if (guard) return guard
        const url = new URL(request.url)
        const yearMonth = url.searchParams.get('yearMonth')
        if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        const summary = await getOrgMonthlySummaryHandler(r.ctx, yearMonth)
        return Response.json(summary)
      },
    },
  },
})
