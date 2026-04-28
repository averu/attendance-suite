import { queryOptions } from '@tanstack/react-query'
import { getJson } from '@/shared/lib/apiClient'
import type { MemberMonthlySummary, OrgMonthlySummary } from './types'

export type MyMonthlySummary = {
  yearMonth: string
  scheduledWorkingDays: number
  isLocked: boolean
  member: MemberMonthlySummary | null
}

export const summaryQueries = {
  monthly: (yearMonth: string) =>
    queryOptions({
      queryKey: ['summary', 'monthly', yearMonth],
      queryFn: () =>
        getJson<OrgMonthlySummary>(
          `/api/summary/monthly?yearMonth=${encodeURIComponent(yearMonth)}`,
        ),
    }),
  mine: (yearMonth: string) =>
    queryOptions({
      queryKey: ['summary', 'mine', yearMonth],
      queryFn: () =>
        getJson<MyMonthlySummary>(
          `/api/summary/mine?yearMonth=${encodeURIComponent(yearMonth)}`,
        ),
    }),
}
