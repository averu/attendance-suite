import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireAdmin } from '@/shared/server/apiAuth'
import { listAttendanceHandler } from '@/features/attendance/server/handlers.server'
import {
  ListMyAttendanceInputSchema,
  GetMemberAttendanceInputSchema,
} from '@/features/attendance/schemas'

// GET /api/attendance/list?yearMonth=YYYY-MM           # 自分
// GET /api/attendance/list?yearMonth=YYYY-MM&userId=…  # admin+ 限定
export const Route = createFileRoute('/api/attendance/list')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const url = new URL(request.url)
        const userIdParam = url.searchParams.get('userId') ?? undefined
        const yearMonth = url.searchParams.get('yearMonth') ?? ''
        if (userIdParam && userIdParam !== r.ctx.user.id) {
          const guard = requireAdmin(r.ctx)
          if (guard) return guard
          const parsed = GetMemberAttendanceInputSchema.safeParse({
            userId: userIdParam,
            yearMonth,
          })
          if (!parsed.success) {
            return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
          }
          const items = await listAttendanceHandler(
            r.ctx.organization.id,
            parsed.data.userId,
            parsed.data.yearMonth,
          )
          return Response.json({ items })
        }
        const parsed = ListMyAttendanceInputSchema.safeParse({ yearMonth })
        if (!parsed.success) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        const items = await listAttendanceHandler(
          r.ctx.organization.id,
          r.ctx.user.id,
          parsed.data.yearMonth,
        )
        return Response.json({ items })
      },
    },
  },
})
