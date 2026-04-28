import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireAdmin } from '@/shared/server/apiAuth'
import { listMembersHandler } from '@/features/organization/server/handlers.server'

export const Route = createFileRoute('/api/organization/members')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireAdmin(r.ctx)
        if (guard) return guard
        const members = await listMembersHandler(r.ctx)
        return Response.json({ members })
      },
    },
  },
})
