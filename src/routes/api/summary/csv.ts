import { createFileRoute } from '@tanstack/react-router'
import { resolveCaller, requireAdmin } from '@/shared/server/apiAuth'
import { buildOrgMonthlySummaryCsv } from '@/features/summary/server/csv.server'

export const Route = createFileRoute('/api/summary/csv')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const r = await resolveCaller(request)
        if (!r.ok) return Response.json({ error: r.code }, { status: r.status })
        const guard = requireAdmin(r.ctx)
        if (guard) return guard
        const url = new URL(request.url)
        const yearMonth = url.searchParams.get('yearMonth')
        if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
          return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }
        const { filename, body } = await buildOrgMonthlySummaryCsv(r.ctx, yearMonth)
        // RFC 5987: 非 ASCII filename を扱えるよう filename* も併記。
        // 認可は Better Auth の cookie session (resolveCaller) に依存。
        // <a href download> でも cookie は送られるので問題なし。
        return new Response(body, {
          headers: {
            'content-type': 'text/csv; charset=utf-8',
            'content-disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
            'cache-control': 'no-store',
          },
        })
      },
    },
  },
})
