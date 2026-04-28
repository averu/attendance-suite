import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller } from '@/shared/server/apiAuth'
import { createLeaveRequestHandler } from '@/features/leave-request/server/handlers.server'
import { CreateLeaveRequestInputSchema } from '@/features/leave-request/schemas'

export const Route = createFileRoute('/api/leave-requests/create')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const body = await request.json().catch(() => ({}))
        const parsed = CreateLeaveRequestInputSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        try {
          const result = await createLeaveRequestHandler(r.ctx, parsed.data)
          return Response.json(result)
        } catch (e) {
          const code = (e as { code?: string }).code ?? 'BAD_REQUEST'
          return Response.json({ error: code }, { status: 400 })
        }
      },
    },
  },
})
