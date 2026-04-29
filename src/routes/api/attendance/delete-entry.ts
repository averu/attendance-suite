import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller } from '@/shared/server/apiAuth'
import { deleteAttendanceEntryHandler } from '@/features/attendance/server/handlers.server'
import { DeleteAttendanceEntryInputSchema } from '@/features/attendance/schemas'

// POST /api/attendance/delete-entry
// 権限分岐は handler 側: member は自分の userId のみ、admin+ は他人も可。
export const Route = createFileRoute('/api/attendance/delete-entry')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const body = await request.json().catch(() => ({}))
        const parsed = DeleteAttendanceEntryInputSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { error: 'INVALID_INPUT', issues: parsed.error.flatten() },
            { status: 400 },
          )
        }
        try {
          const result = await deleteAttendanceEntryHandler(r.ctx, parsed.data)
          return Response.json(result)
        } catch (e) {
          const code = (e as { code?: string }).code ?? 'BAD_REQUEST'
          // FORBIDDEN は 403、NOT_FOUND は 404、月次ロックは 423、それ以外は 400 で返す
          const STATUS_MAP: Record<string, number> = {
            FORBIDDEN: 403,
            NOT_FOUND: 404,
            TARGET_NOT_FOUND: 404,
            MONTH_LOCKED: 423,
          }
          const status = STATUS_MAP[code] ?? 400
          return Response.json({ error: code }, { status })
        }
      },
    },
  },
})
