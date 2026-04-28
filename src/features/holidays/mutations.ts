import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postJson } from '@/shared/lib/apiClient'
import type { CreateHolidayInput, DeleteHolidayInput } from './schemas'

export function useCreateHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateHolidayInput) =>
      postJson<{ id: string }>('/api/holidays/create', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays'] })
      qc.invalidateQueries({ queryKey: ['summary'] })
    },
  })
}

export function useDeleteHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: DeleteHolidayInput) =>
      postJson<{ ok: true }>('/api/holidays/delete', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays'] })
      qc.invalidateQueries({ queryKey: ['summary'] })
    },
  })
}
