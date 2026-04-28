import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postJson } from '@/shared/lib/apiClient'
import type { TimeEntry } from './types'
import type { EditAttendanceEntryInput } from './schemas'

function makeMutation(path: string) {
  return function useFn() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: () => postJson<{ entry: TimeEntry }>(path),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['attendance', 'today'] })
        qc.invalidateQueries({ queryKey: ['attendance', 'monthly'] })
        qc.invalidateQueries({ queryKey: ['attendance', 'detail'] })
      },
    })
  }
}

export const useClockIn = makeMutation('/api/attendance/clock-in')
export const useClockOut = makeMutation('/api/attendance/clock-out')
export const useBreakStart = makeMutation('/api/attendance/break-start')
export const useBreakEnd = makeMutation('/api/attendance/break-end')

// 直接編集 (admin+ 限定)。修正申請を経由せず即時反映。
export function useEditAttendanceEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: EditAttendanceEntryInput) =>
      postJson<{ entry: TimeEntry }>('/api/attendance/edit-entry', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] })
      qc.invalidateQueries({ queryKey: ['summary'] })
    },
  })
}
