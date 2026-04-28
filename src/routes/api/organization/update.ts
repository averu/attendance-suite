import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireOwner } from '@/shared/server/apiAuth'
import { updateOrganizationHandler } from '@/features/organization/server/handlers.server'
import { UpdateOrganizationInputSchema } from '@/features/organization/schemas'

export const Route = createFileRoute('/api/organization/update')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireOwner(r.ctx)
        if (guard) return guard
        const body = await request.json().catch(() => ({}))
        const parsed = UpdateOrganizationInputSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        const result = await updateOrganizationHandler(r.ctx, parsed.data)
        return Response.json(result)
      },
    },
  },
})
