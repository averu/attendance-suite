import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireAdmin } from '@/shared/server/apiAuth'
import { getOrgPaidLeaveObligationsHandler } from '@/features/leave-request/server/handlers.server'

// GET /api/admin/leave-obligations?asOf=YYYY-MM-DD
// owner / admin 向け: org 全メンバーの「年 5 日取得義務」状況を返す。
export const Route = createFileRoute('/api/admin/leave-obligations')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireAdmin(r.ctx)
        if (guard) return guard
        const url = new URL(request.url)
        const asOf = url.searchParams.get('asOf') ?? todayJST()
        if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        const items = await getOrgPaidLeaveObligationsHandler(r.ctx, asOf)
        return Response.json({ items })
      },
    },
  },
})

function todayJST(): string {
  const ms = Date.now() + 9 * 60 * 60 * 1000
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}
