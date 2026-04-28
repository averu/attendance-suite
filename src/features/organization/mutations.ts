import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postJson } from '@/shared/lib/apiClient'
import type {
  AcceptInvitationInput,
  ChangeRoleInput,
  InviteInput,
  RemoveMemberInput,
  UpdateOrganizationInput,
} from './schemas'

export function useInviteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: InviteInput) =>
      postJson<{ token: string; expiresAt: string }>(
        '/api/organization/invitations',
        input,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization', 'invitations'] })
    },
  })
}

export function useAcceptInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AcceptInvitationInput) =>
      postJson<{ ok: true; organizationId: string }>(
        '/api/organization/accept-invitation',
        input,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'session'] })
    },
  })
}

export function useChangeRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ChangeRoleInput) =>
      postJson<{ ok: true }>('/api/organization/change-role', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization', 'members'] })
    },
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RemoveMemberInput) =>
      postJson<{ ok: true }>('/api/organization/remove-member', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization', 'members'] })
    },
  })
}

export function useUpdateOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateOrganizationInput) =>
      postJson<{ ok: true }>('/api/organization/update', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'session'] })
    },
  })
}
