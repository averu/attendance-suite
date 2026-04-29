import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller } from '@/shared/server/apiAuth'
import { getMyPaidLeaveBalanceHandler } from '@/features/leave-request/server/handlers.server'

// GET /api/leave-requests/balance?asOf=YYYY-MM-DD
// asOf 省略時は今日 (Asia/Tokyo) を使う。
export const Route = createFileRoute('/api/leave-requests/balance')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const url = new URL(request.url)
        const asOf = url.searchParams.get('asOf') ?? todayJST()
        if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        const data = await getMyPaidLeaveBalanceHandler(r.ctx, asOf)
        return Response.json(data)
      },
    },
  },
})

function todayJST(): string {
  // UTC + 9h の y-m-d を抽出
  const ms = Date.now() + 9 * 60 * 60 * 1000
  const d = new Date(ms)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}
