import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller } from '@/shared/server/apiAuth'
import { listMyOpenRemindersHandler } from '@/features/attendance/server/handlers.server'

export const Route = createFileRoute('/api/attendance/reminders')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const items = await listMyOpenRemindersHandler(r.ctx)
        return Response.json({ items })
      },
    },
  },
})
