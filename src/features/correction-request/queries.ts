import { queryOptions } from '@tanstack/react-query'
import { getJson } from '@/shared/lib/apiClient'
import type { CorrectionRequestDTO } from './types'

export const correctionRequestQueries = {
  mine: () =>
    queryOptions({
      queryKey: ['correction-requests', 'mine'],
      queryFn: () =>
        getJson<{ items: CorrectionRequestDTO[] }>(
          '/api/correction-requests/list-mine',
        ),
      select: (d) => d.items,
    }),
  org: (filter: { status?: string; userId?: string } = {}) =>
    queryOptions({
      queryKey: ['correction-requests', 'org', filter],
      queryFn: () => {
        const params = new URLSearchParams()
        if (filter.status) params.set('status', filter.status)
        if (filter.userId) params.set('userId', filter.userId)
        const qs = params.toString()
        return getJson<{ items: CorrectionRequestDTO[] }>(
          `/api/correction-requests/list-org${qs ? `?${qs}` : ''}`,
        )
      },
      select: (d) => d.items,
    }),
}
