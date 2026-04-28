import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postJson } from '@/shared/lib/apiClient'
import type { TimeEntry } from './types'

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
