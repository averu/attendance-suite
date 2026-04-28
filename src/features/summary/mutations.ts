import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postJson } from '@/shared/lib/apiClient'

export function useToggleMonthlyLock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { yearMonth: string; action: 'lock' | 'unlock' }) =>
      postJson<{ ok: true }>('/api/summary/lock', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['summary'] }),
  })
}
