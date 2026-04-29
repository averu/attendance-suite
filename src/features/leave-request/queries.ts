import { queryOptions } from '@tanstack/react-query'
import { getJson } from '@/shared/lib/apiClient'
import type {
  AdminLeaveGrantDTO,
  LeaveRequestDTO,
  OrgPaidLeaveObligationDTO,
  PaidLeaveBalanceDTO,
} from './types'

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
  myBalance: (asOf?: string) =>
    queryOptions({
      queryKey: ['leave-requests', 'my-balance', asOf ?? 'today'],
      queryFn: () =>
        getJson<PaidLeaveBalanceDTO>(
          `/api/leave-requests/balance${asOf ? `?asOf=${asOf}` : ''}`,
        ),
    }),
  orgObligations: (asOf?: string) =>
    queryOptions({
      queryKey: ['leave-requests', 'org-obligations', asOf ?? 'today'],
      queryFn: () =>
        getJson<{ items: OrgPaidLeaveObligationDTO[] }>(
          `/api/admin/leave-obligations${asOf ? `?asOf=${asOf}` : ''}`,
        ),
      select: (d) => d.items,
    }),
  memberGrants: (userId: string) =>
    queryOptions({
      queryKey: ['leave-grants', 'member', userId],
      queryFn: () =>
        getJson<{ items: AdminLeaveGrantDTO[] }>(
          `/api/admin/leave-grants/list?userId=${encodeURIComponent(userId)}`,
        ),
      select: (d) => d.items,
    }),
}
