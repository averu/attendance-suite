import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postJson } from '@/shared/lib/apiClient'
import type {
  AcceptInvitationInput,
  BulkInviteInput,
  BulkRevokeInvitationsInput,
  ChangeRoleInput,
  InviteInput,
  RemoveMemberInput,
  RevokeInvitationInput,
  UpdateMemberWorkProfileInput,
  UpdateOrganizationInput,
} from './schemas'

export type BulkInviteResultItem = {
  email: string
  status: 'invited' | 'skipped'
  token?: string
  expiresAt?: string
  skipReason?: 'ALREADY_MEMBER' | 'INVITATION_PENDING'
}

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
    // accept handler 側で active organization も切替えているので、
    // 直前 org のキャッシュは全部捨てる (switch-organization と同じ扱い)。
    onSuccess: () => {
      qc.clear()
    },
  })
}

export function useRevokeInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RevokeInvitationInput) =>
      postJson<{ ok: true }>('/api/organization/revoke-invitation', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization', 'invitations'] })
    },
  })
}

export function useBulkRevokeInvitations() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BulkRevokeInvitationsInput) =>
      postJson<{ deletedCount: number; skippedCount: number }>(
        '/api/organization/revoke-invitation/bulk',
        input,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization', 'invitations'] })
    },
  })
}

export function useBulkInviteMembers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BulkInviteInput) =>
      postJson<{ items: BulkInviteResultItem[] }>(
        '/api/organization/invitations/bulk',
        input,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization', 'invitations'] })
      qc.invalidateQueries({ queryKey: ['organization', 'members'] })
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

export function useUpdateMemberWorkProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateMemberWorkProfileInput) =>
      postJson<{ ok: true }>(
        '/api/organization/update-member-work-profile',
        input,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization', 'members'] })
      // 残高にも影響するので invalidate
      qc.invalidateQueries({ queryKey: ['leave-requests', 'my-balance'] })
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

// active organization 切替。完了後は queryClient.clear() で全キャッシュを破棄してから
// auth session を再取得する想定。
export function useSwitchOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { organizationId: string }) =>
      postJson<{ ok: true }>('/api/me/switch-organization', input),
    onSuccess: () => {
      qc.clear()
    },
  })
}

// 新組織を作って自分を owner として加入。active organization も新組織になる。
export function useCreateOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string }) =>
      postJson<{ ok: true; organizationId: string }>(
        '/api/bootstrap-org',
        input,
      ),
    onSuccess: () => {
      qc.clear()
    },
  })
}

// 指定組織から脱退。唯一の owner なら 400 で拒否される。
export function useLeaveOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { organizationId: string }) =>
      postJson<{ ok: true }>('/api/me/leave-organization', input),
    onSuccess: () => {
      qc.clear()
    },
  })
}
