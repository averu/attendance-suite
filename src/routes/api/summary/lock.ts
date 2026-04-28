import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireOwner } from '@/shared/server/apiAuth'
import {
  lockMonthHandler,
  unlockMonthHandler,
} from '@/features/summary/server/handlers.server'
import { z } from 'zod'

const Input = z.object({
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
  action: z.enum(['lock', 'unlock']),
})

export const Route = createFileRoute('/api/summary/lock')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireOwner(r.ctx)
        if (guard) return guard
        const body = await request.json().catch(() => ({}))
        const parsed = Input.safeParse(body)
        if (!parsed.success) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        try {
          const result =
            parsed.data.action === 'lock'
              ? await lockMonthHandler(r.ctx, parsed.data.yearMonth)
              : await unlockMonthHandler(r.ctx, parsed.data.yearMonth)
          return Response.json(result)
        } catch (e) {
          const code = (e as { code?: string }).code ?? 'BAD_REQUEST'
          return Response.json({ error: code }, { status: 400 })
        }
      },
    },
  },
})
