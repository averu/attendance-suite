import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller } from '@/shared/server/apiAuth'
import { clockInHandler } from '@/features/attendance/server/handlers.server'

export const Route = createFileRoute('/api/attendance/clock-in')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        try {
          const entry = await clockInHandler(r.ctx)
          return Response.json({ entry })
        } catch (e) {
          const code = (e as { code?: string }).code ?? 'BAD_REQUEST'
          return Response.json({ error: code }, { status: 400 })
        }
      },
    },
  },
})
