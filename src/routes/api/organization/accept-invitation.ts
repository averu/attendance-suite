import { createFileRoute } from '@tanstack/react-router'
import { acceptInvitationHandler } from '@/features/organization/server/handlers.server'
import { AcceptInvitationInputSchema } from '@/features/organization/schemas'
import { auth } from '@/features/auth/server/auth.server'

// 招待受諾は session 必須だが、まだ membership が無い状態で呼ばれるので
// resolveCaller (membership 必須) は使えない。session を直接検証する。
export const Route = createFileRoute('/api/organization/accept-invitation')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session?.user) {
          return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })
        }
        const body = await request.json().catch(() => ({}))
        const parsed = AcceptInvitationInputSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        try {
          const result = await acceptInvitationHandler(
            {
              user: {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
              },
              // handler 内では user と input.token しか参照しないので残りはダミー
              membership: { id: '', organizationId: '', role: 'member' },
              organization: {
                id: '',
                name: '',
                slug: '',
                timezone: '',
                dailyScheduledMinutes: 0,
                weeklyScheduledMinutes: 0,
                legalHolidayDow: 0,
              },
            },
            parsed.data,
          )
          return Response.json(result)
        } catch (e) {
          const code = (e as { code?: string }).code ?? 'BAD_REQUEST'
          return Response.json({ error: code }, { status: 400 })
        }
      },
    },
  },
})
