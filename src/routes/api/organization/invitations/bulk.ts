import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireOwner } from '@/shared/server/apiAuth'
import { bulkInviteMembersHandler } from '@/features/organization/server/handlers.server'
import { BulkInviteInputSchema } from '@/features/organization/schemas'

// POST /api/organization/invitations/bulk — 複数 email に一括招待発行 (owner のみ)
export const Route = createFileRoute('/api/organization/invitations/bulk')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireOwner(r.ctx)
        if (guard) return guard
        const body = await request.json().catch(() => ({}))
        const parsed = BulkInviteInputSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        const result = await bulkInviteMembersHandler(r.ctx, parsed.data)
        return Response.json(result)
      },
    },
  },
})
