import { queryOptions } from '@tanstack/react-query'
import { getJson } from '@/shared/lib/apiClient'
import type { HolidayDTO } from './types'

export const holidayQueries = {
  list: (yearMonth?: string) =>
    queryOptions({
      queryKey: ['holidays', { yearMonth: yearMonth ?? null }],
      queryFn: () => {
        const params = new URLSearchParams()
        if (yearMonth) params.set('yearMonth', yearMonth)
        const qs = params.toString()
        return getJson<{ items: HolidayDTO[] }>(
          `/api/holidays${qs ? `?${qs}` : ''}`,
        )
      },
      select: (d) => d.items,
    }),
}
