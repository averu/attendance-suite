import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireAdmin } from '@/shared/server/apiAuth'
import { bulkCreateHolidaysHandler } from '@/features/holidays/server/handlers.server'
import { BulkCreateHolidaysInputSchema } from '@/features/holidays/schemas'

// POST /api/holidays/bulk — 公休の一括登録 (既存と重複する date は skip)
export const Route = createFileRoute('/api/holidays/bulk')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireAdmin(r.ctx)
        if (guard) return guard
        const body = await request.json().catch(() => ({}))
        const parsed = BulkCreateHolidaysInputSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        const result = await bulkCreateHolidaysHandler(r.ctx, parsed.data)
        return Response.json(result)
      },
    },
  },
})
