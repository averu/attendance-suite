import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireAdmin } from '@/shared/server/apiAuth'
import { listAttendanceAuditsHandler } from '@/features/attendance/server/handlers.server'

export const Route = createFileRoute('/api/attendance/audits')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireAdmin(r.ctx)
        if (guard) return guard
        const url = new URL(request.url)
        const userId = url.searchParams.get('userId') ?? ''
        const workDate = url.searchParams.get('workDate') ?? ''
        if (!userId || !/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        const items = await listAttendanceAuditsHandler(r.ctx, userId, workDate)
        return Response.json({ items })
      },
    },
  },
})
