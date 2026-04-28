import { queryOptions } from '@tanstack/react-query'
import { getJson } from '@/shared/lib/apiClient'
import type { OrgMonthlySummary } from './types'

export const summaryQueries = {
  monthly: (yearMonth: string) =>
    queryOptions({
      queryKey: ['summary', 'monthly', yearMonth],
      queryFn: () =>
        getJson<OrgMonthlySummary>(
          `/api/summary/monthly?yearMonth=${encodeURIComponent(yearMonth)}`,
        ),
    }),
}
