import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireOwner } from '@/shared/server/apiAuth'
import { bulkRevokeInvitationsHandler } from '@/features/organization/server/handlers.server'
import { BulkRevokeInvitationsInputSchema } from '@/features/organization/schemas'

// POST /api/organization/revoke-invitation/bulk — 期限切れ等の招待をまとめて削除
export const Route = createFileRoute('/api/organization/revoke-invitation/bulk')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireOwner(r.ctx)
        if (guard) return guard
        const body = await request.json().catch(() => ({}))
        const parsed = BulkRevokeInvitationsInputSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        const result = await bulkRevokeInvitationsHandler(r.ctx, parsed.data)
        return Response.json(result)
      },
    },
  },
})
