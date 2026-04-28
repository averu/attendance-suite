import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireOwner } from '@/shared/server/apiAuth'
import { changeRoleHandler } from '@/features/organization/server/handlers.server'
import { ChangeRoleInputSchema } from '@/features/organization/schemas'

export const Route = createFileRoute('/api/organization/change-role')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireOwner(r.ctx)
        if (guard) return guard
        const body = await request.json().catch(() => ({}))
        const parsed = ChangeRoleInputSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        try {
          const result = await changeRoleHandler(r.ctx, parsed.data)
          return Response.json(result)
        } catch (e) {
          const code = (e as { code?: string }).code ?? 'BAD_REQUEST'
          return Response.json({ error: code }, { status: 400 })
        }
      },
    },
  },
})
