import { queryOptions } from '@tanstack/react-query'
import { getJson } from '@/shared/lib/apiClient'
import type { LeaveRequestDTO } from './types'

export const leaveRequestQueries = {
  mine: () =>
    queryOptions({
      queryKey: ['leave-requests', 'mine'],
      queryFn: () =>
        getJson<{ items: LeaveRequestDTO[] }>('/api/leave-requests/list-mine'),
      select: (d) => d.items,
    }),
  org: (filter: { status?: string; userId?: string } = {}) =>
    queryOptions({
      queryKey: ['leave-requests', 'org', filter],
      queryFn: () => {
        const params = new URLSearchParams()
        if (filter.status) params.set('status', filter.status)
        if (filter.userId) params.set('userId', filter.userId)
        const qs = params.toString()
        return getJson<{ items: LeaveRequestDTO[] }>(
          `/api/leave-requests/list-org${qs ? `?${qs}` : ''}`,
        )
      },
      select: (d) => d.items,
    }),
}
