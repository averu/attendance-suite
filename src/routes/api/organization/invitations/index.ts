import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireOwner } from '@/shared/server/apiAuth'
import {
  inviteMemberHandler,
  listInvitationsHandler,
} from '@/features/organization/server/handlers.server'
import { InviteInputSchema } from '@/features/organization/schemas'

export const Route = createFileRoute('/api/organization/invitations/')({
  server: {
    handlers: {
      // 招待は owner だけが発行できる仕様なので、一覧も owner に揃える
      // (admin に閲覧権限を持たせない)。
      GET: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireOwner(r.ctx)
        if (guard) return guard
        const invitations = await listInvitationsHandler(r.ctx)
        return Response.json({ invitations })
      },
      POST: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireOwner(r.ctx)
        if (guard) return guard
        const body = await request.json().catch(() => ({}))
        const parsed = InviteInputSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        const result = await inviteMemberHandler(r.ctx, parsed.data)
        return Response.json(result)
      },
    },
  },
})
