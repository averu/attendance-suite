import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireAdmin } from '@/shared/server/apiAuth'
import { getAttendanceDetailHandler } from '@/features/attendance/server/handlers.server'
import {
  GetAttendanceDetailInputSchema,
  GetMemberAttendanceDetailInputSchema,
} from '@/features/attendance/schemas'

// GET /api/attendance/detail?workDate=YYYY-MM-DD          # 自分
// GET /api/attendance/detail?workDate=…&userId=…          # admin+
export const Route = createFileRoute('/api/attendance/detail')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const url = new URL(request.url)
        const userIdParam = url.searchParams.get('userId') ?? undefined
        const workDate = url.searchParams.get('workDate') ?? ''
        if (userIdParam && userIdParam !== r.ctx.user.id) {
          const guard = requireAdmin(r.ctx)
          if (guard) return guard
          const parsed = GetMemberAttendanceDetailInputSchema.safeParse({
            userId: userIdParam,
            workDate,
          })
          if (!parsed.success) {
            return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
          }
          const result = await getAttendanceDetailHandler(
            r.ctx,
            parsed.data.userId,
            parsed.data.workDate,
          )
          return Response.json(result)
        }
        const parsed = GetAttendanceDetailInputSchema.safeParse({ workDate })
        if (!parsed.success) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        const result = await getAttendanceDetailHandler(
          r.ctx,
          r.ctx.user.id,
          parsed.data.workDate,
        )
        return Response.json(result)
      },
    },
  },
})
