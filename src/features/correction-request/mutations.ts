import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postJson } from '@/shared/lib/apiClient'
import type {
  CancelCorrectionRequestInput,
  CreateCorrectionRequestInput,
  ReviewCorrectionRequestInput,
} from './schemas'

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['correction-requests'] })
  qc.invalidateQueries({ queryKey: ['attendance'] })
}

export function useCreateCorrectionRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCorrectionRequestInput) =>
      postJson<{ id: string }>('/api/correction-requests/create', input),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useCancelCorrectionRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CancelCorrectionRequestInput) =>
      postJson<{ ok: true }>('/api/correction-requests/cancel', input),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useApproveCorrectionRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ReviewCorrectionRequestInput) =>
      postJson<{ ok: true }>('/api/correction-requests/approve', input),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useRejectCorrectionRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ReviewCorrectionRequestInput) =>
      postJson<{ ok: true }>('/api/correction-requests/reject', input),
    onSuccess: () => invalidateAll(qc),
  })
}
