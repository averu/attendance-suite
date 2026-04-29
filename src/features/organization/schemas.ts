import { z } from 'zod'

export const InviteRoleSchema = z.enum(['member', 'admin'])
export const RoleSchema = z.enum(['member', 'admin', 'owner'])

export const InviteInputSchema = z.object({
  email: z.string().email().max(255),
  role: InviteRoleSchema.default('member'),
})

// 一括招待: 1-100 件、role は全件共通
export const BulkInviteInputSchema = z.object({
  emails: z.array(z.string().email().max(255)).min(1).max(100),
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
  // 労働時間設定。所定労働時間は 0-720 分 (= 0h-12h) の範囲を許容。
  // 法定休日の曜日 0-6 (0=日)。
  dailyScheduledMinutes: z.number().int().min(0).max(720),
  weeklyScheduledMinutes: z.number().int().min(0).max(60 * 60),
  legalHolidayDow: z.number().int().min(0).max(6),
})

export const AcceptInvitationInputSchema = z.object({
  token: z.string().min(1),
})

export const RevokeInvitationInputSchema = z.object({
  invitationId: z.string().uuid(),
})

// 一括削除: 1-500 件、acceptedAt 済みは skip
export const BulkRevokeInvitationsInputSchema = z.object({
  invitationIds: z.array(z.string().uuid()).min(1).max(500),
})

// 労務情報 (有給算定の入力) を更新するスキーマ。null を渡すとクリア。
export const UpdateMemberWorkProfileInputSchema = z.object({
  membershipId: z.string().uuid(),
  hireDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  weeklyScheduledDays: z.number().int().min(0).max(7).nullable(),
  weeklyScheduledHours: z.number().min(0).max(168).nullable(),
})

export type InviteInput = z.infer<typeof InviteInputSchema>
export type ChangeRoleInput = z.infer<typeof ChangeRoleInputSchema>
export type RemoveMemberInput = z.infer<typeof RemoveMemberInputSchema>
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationInputSchema>
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationInputSchema>
export type RevokeInvitationInput = z.infer<typeof RevokeInvitationInputSchema>
export type UpdateMemberWorkProfileInput = z.infer<
  typeof UpdateMemberWorkProfileInputSchema
>
export type BulkInviteInput = z.infer<typeof BulkInviteInputSchema>
export type BulkRevokeInvitationsInput = z.infer<
  typeof BulkRevokeInvitationsInputSchema
>
