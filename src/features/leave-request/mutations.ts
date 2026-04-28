import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postJson } from '@/shared/lib/apiClient'
import type {
  CancelLeaveRequestInput,
  CreateLeaveRequestInput,
  ReviewLeaveRequestInput,
} from './schemas'

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['leave-requests'] })
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateLeaveRequestInput) =>
      postJson<{ id: string }>('/api/leave-requests/create', input),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useCancelLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CancelLeaveRequestInput) =>
      postJson<{ ok: true }>('/api/leave-requests/cancel', input),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useApproveLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ReviewLeaveRequestInput) =>
      postJson<{ ok: true }>('/api/leave-requests/approve', input),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useRejectLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ReviewLeaveRequestInput) =>
      postJson<{ ok: true }>('/api/leave-requests/reject', input),
    onSuccess: () => invalidateAll(qc),
  })
}
