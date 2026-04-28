import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireOwner } from '@/shared/server/apiAuth'
import { removeMemberHandler } from '@/features/organization/server/handlers.server'
import { RemoveMemberInputSchema } from '@/features/organization/schemas'

export const Route = createFileRoute('/api/organization/remove-member')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireOwner(r.ctx)
        if (guard) return guard
        const body = await request.json().catch(() => ({}))
        const parsed = RemoveMemberInputSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        try {
          const result = await removeMemberHandler(r.ctx, parsed.data)
          return Response.json(result)
        } catch (e) {
          const code = (e as { code?: string }).code ?? 'BAD_REQUEST'
          return Response.json({ error: code }, { status: 400 })
        }
      },
    },
  },
})
