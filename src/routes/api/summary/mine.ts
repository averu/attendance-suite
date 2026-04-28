import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { resolveCaller } from '@/shared/server/apiAuth'
import { getMyMonthlySummaryHandler } from '@/features/summary/server/handlers.server'

const QuerySchema = z.object({
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/, 'YYYY-MM'),
})

export const Route = createFileRoute('/api/summary/mine')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const url = new URL(request.url)
        const parsed = QuerySchema.safeParse({
          yearMonth: url.searchParams.get('yearMonth'),
        })
        if (!parsed.success) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        const result = await getMyMonthlySummaryHandler(
          r.ctx,
          parsed.data.yearMonth,
        )
        return Response.json(result)
      },
    },
  },
})
