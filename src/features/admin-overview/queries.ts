import { queryOptions } from '@tanstack/react-query'
import { getJson } from '@/shared/lib/apiClient'
import type { OrgTodayStatus } from './types'
import type { DailyTrendPoint } from './recentTrend'

export const adminOverviewQueries = {
  today: () =>
    queryOptions({
      queryKey: ['admin-overview', 'today'],
      queryFn: () => getJson<OrgTodayStatus>('/api/admin/today'),
      staleTime: 30_000,
    }),
  recentTrend: (days = 7) =>
    queryOptions({
      queryKey: ['admin-overview', 'recent-trend', days],
      queryFn: () =>
        getJson<{ days: DailyTrendPoint[] }>(
          `/api/admin/recent-trend?days=${days}`,
        ),
      select: (d) => d.days,
      staleTime: 60_000,
    }),
}
