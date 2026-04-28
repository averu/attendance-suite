import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireAdmin } from '@/shared/server/apiAuth'
import { editAttendanceEntryHandler } from '@/features/attendance/server/handlers.server'
import { EditAttendanceEntryInputSchema } from '@/features/attendance/schemas'

// POST /api/attendance/edit-entry — admin+ 限定。修正申請を経由しない直接編集。
export const Route = createFileRoute('/api/attendance/edit-entry')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireAdmin(r.ctx)
        if (guard) return guard
        const body = await request.json().catch(() => ({}))
        const parsed = EditAttendanceEntryInputSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { error: 'INVALID_INPUT', issues: parsed.error.flatten() },
            { status: 400 },
          )
        }
        try {
          const result = await editAttendanceEntryHandler(r.ctx, parsed.data)
          return Response.json(result)
        } catch (e) {
          const code = (e as { code?: string }).code ?? 'BAD_REQUEST'
          return Response.json({ error: code }, { status: 400 })
        }
      },
    },
  },
})
