import { queryOptions } from '@tanstack/react-query'
import { getJson } from '@/shared/lib/apiClient'
import type {
  AuditLogEntry,
  DailyTotal,
  OpenReminder,
  TimeEntry,
  TodayStatus,
} from './types'

export const attendanceQueries = {
  today: () =>
    queryOptions({
      queryKey: ['attendance', 'today'],
      queryFn: () => getJson<TodayStatus>('/api/attendance/today'),
      staleTime: 5_000,
    }),
  monthly: (yearMonth: string, userId?: string) =>
    queryOptions({
      queryKey: ['attendance', 'monthly', { yearMonth, userId: userId ?? null }],
      queryFn: () => {
        const params = new URLSearchParams({ yearMonth })
        if (userId) params.set('userId', userId)
        return getJson<{ items: DailyTotal[] }>(
          `/api/attendance/list?${params.toString()}`,
        )
      },
      select: (d) => d.items,
    }),
  detail: (workDate: string, userId?: string) =>
    queryOptions({
      queryKey: ['attendance', 'detail', { workDate, userId: userId ?? null }],
      queryFn: () => {
        const params = new URLSearchParams({ workDate })
        if (userId) params.set('userId', userId)
        return getJson<{ entry: TimeEntry | null }>(
          `/api/attendance/detail?${params.toString()}`,
        )
      },
      select: (d) => d.entry,
    }),
  audits: (userId: string, workDate: string) =>
    queryOptions({
      queryKey: ['attendance', 'audits', { userId, workDate }],
      queryFn: () => {
        const params = new URLSearchParams({ userId, workDate })
        return getJson<{ items: AuditLogEntry[] }>(
          `/api/attendance/audits?${params.toString()}`,
        )
      },
      select: (d) => d.items,
    }),
  reminders: () =>
    queryOptions({
      queryKey: ['attendance', 'reminders'],
      queryFn: () =>
        getJson<{ items: OpenReminder[] }>('/api/attendance/reminders'),
      select: (d) => d.items,
      staleTime: 60_000,
    }),
}
