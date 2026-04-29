import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireAdmin } from '@/shared/server/apiAuth'
import { syncAutoLeaveGrantsHandler } from '@/features/leave-request/server/handlers.server'
import { SyncAutoLeaveGrantsInputSchema } from '@/features/leave-request/schemas'

// POST /api/admin/leave-grants/sync — 雇入日から auto 付与を補完
// body: { userId? } — 省略時は org 全員
// query: ?asOf=YYYY-MM-DD (省略時は今日 JST)
export const Route = createFileRoute('/api/admin/leave-grants/sync')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireAdmin(r.ctx)
        if (guard) return guard
        const url = new URL(request.url)
        const asOf = url.searchParams.get('asOf') ?? todayJST()
        if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        const body = await request.json().catch(() => ({}))
        const parsed = SyncAutoLeaveGrantsInputSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        const result = await syncAutoLeaveGrantsHandler(r.ctx, parsed.data, asOf)
        return Response.json(result)
      },
    },
  },
})

function todayJST(): string {
  const ms = Date.now() + 9 * 60 * 60 * 1000
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}
