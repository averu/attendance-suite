import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireOwner } from '@/shared/server/apiAuth'
import { revokeInvitationHandler } from '@/features/organization/server/handlers.server'
import { RevokeInvitationInputSchema } from '@/features/organization/schemas'

// POST /api/organization/revoke-invitation — 未受諾の招待を削除する。
// owner のみ可。受諾済 (acceptedAt!=null) は INVITATION_ALREADY_ACCEPTED で拒否。
export const Route = createFileRoute('/api/organization/revoke-invitation')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireOwner(r.ctx)
        if (guard) return guard
        const body = await request.json().catch(() => ({}))
        const parsed = RevokeInvitationInputSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        try {
          const result = await revokeInvitationHandler(r.ctx, parsed.data)
          return Response.json(result)
        } catch (e) {
          const code = (e as { code?: string }).code ?? 'BAD_REQUEST'
          return Response.json({ error: code }, { status: 400 })
        }
      },
    },
  },
})
