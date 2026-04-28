import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller } from '@/shared/server/apiAuth'
import { listHolidaysHandler } from '@/features/holidays/server/handlers.server'

export const Route = createFileRoute('/api/holidays/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const url = new URL(request.url)
        const yearMonth = url.searchParams.get('yearMonth') ?? undefined
        const items = await listHolidaysHandler(r.ctx, yearMonth)
        return Response.json({ items })
      },
    },
  },
})
