import { z } from 'zod'

export const InviteRoleSchema = z.enum(['member', 'admin'])
export const RoleSchema = z.enum(['member', 'admin', 'owner'])

export const InviteInputSchema = z.object({
  email: z.string().email().max(255),
  role: InviteRoleSchema.default('member'),
})

export const ChangeRoleInputSchema = z.object({
  membershipId: z.string().uuid(),
  role: RoleSchema,
})

export const RemoveMemberInputSchema = z.object({
  membershipId: z.string().uuid(),
})

export const UpdateOrganizationInputSchema = z.object({
  name: z.string().min(1).max(100),
  timezone: z.string().min(1).max(64),
})

export const AcceptInvitationInputSchema = z.object({
  token: z.string().min(1),
})

export const RevokeInvitationInputSchema = z.object({
  invitationId: z.string().uuid(),
})

export type InviteInput = z.infer<typeof InviteInputSchema>
export type ChangeRoleInput = z.infer<typeof ChangeRoleInputSchema>
export type RemoveMemberInput = z.infer<typeof RemoveMemberInputSchema>
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationInputSchema>
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationInputSchema>
export type RevokeInvitationInput = z.infer<typeof RevokeInvitationInputSchema>
