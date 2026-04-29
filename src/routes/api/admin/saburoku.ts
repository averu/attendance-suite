import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireAdmin } from '@/shared/server/apiAuth'
import { getOrgSaburokuFindingsHandler } from '@/features/admin-overview/server/saburoku.server'

// GET /api/admin/saburoku?yearMonth=YYYY-MM
// owner / admin 向け: 過去 12 ヶ月の各メンバー 36 協定アセスメント
export const Route = createFileRoute('/api/admin/saburoku')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireAdmin(r.ctx)
        if (guard) return guard
        const url = new URL(request.url)
        const ym = url.searchParams.get('yearMonth') ?? thisMonthJST()
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        const data = await getOrgSaburokuFindingsHandler(r.ctx, ym)
        return Response.json(data)
      },
    },
  },
})

function thisMonthJST(): string {
  const ms = Date.now() + 9 * 60 * 60 * 1000
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
