import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller } from '@/shared/server/apiAuth'
import { breakStartHandler } from '@/features/attendance/server/handlers.server'

export const Route = createFileRoute('/api/attendance/break-start')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        try {
          const entry = await breakStartHandler(r.ctx)
          return Response.json({ entry })
        } catch (e) {
          const code = (e as { code?: string }).code ?? 'BAD_REQUEST'
          return Response.json({ error: code }, { status: 400 })
        }
      },
    },
  },
})
