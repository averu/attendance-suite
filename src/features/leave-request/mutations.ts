import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postJson } from '@/shared/lib/apiClient'
import type {
  AddLeaveGrantInput,
  CancelLeaveRequestInput,
  CreateLeaveRequestInput,
  RemoveLeaveGrantInput,
  ReviewLeaveRequestInput,
  SyncAutoLeaveGrantsInput,
} from './schemas'

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['leave-requests'] })
  qc.invalidateQueries({ queryKey: ['leave-grants'] })
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

export function useAddLeaveGrant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AddLeaveGrantInput) =>
      postJson<{ id: string }>('/api/admin/leave-grants/add', input),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useRemoveLeaveGrant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RemoveLeaveGrantInput) =>
      postJson<{ ok: true }>('/api/admin/leave-grants/remove', input),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useSyncAutoLeaveGrants() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SyncAutoLeaveGrantsInput = {}) =>
      postJson<{ syncedCount: number }>(
        '/api/admin/leave-grants/sync',
        input,
      ),
    onSuccess: () => invalidateAll(qc),
  })
}
