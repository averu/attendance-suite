import { z } from 'zod'

export const LeaveTypeSchema = z.enum([
  'paid_full',
  'paid_half_am',
  'paid_half_pm',
  'substitute',
  'special',
  'sick',
  'other',
])

const WorkDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 形式')

export const CreateLeaveRequestInputSchema = z
  .object({
    leaveType: LeaveTypeSchema,
    startDate: WorkDate,
    endDate: WorkDate,
    reason: z.string().min(1).max(1000),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: '終了日は開始日以降である必要があります',
    path: ['endDate'],
  })
  .refine(
    (v) => {
      const halfDay = v.leaveType === 'paid_half_am' || v.leaveType === 'paid_half_pm'
      return !halfDay || v.startDate === v.endDate
    },
    { message: '半休は単日のみ申請できます', path: ['endDate'] },
  )

export const CancelLeaveRequestInputSchema = z.object({
  requestId: z.string().uuid(),
})

export const ReviewLeaveRequestInputSchema = z.object({
  requestId: z.string().uuid(),
  comment: z.string().max(1000).optional(),
})

// 手動付与: admin が初期設定や繰越を直接登録する
export const AddLeaveGrantInputSchema = z.object({
  userId: z.string().min(1),
  grantDate: WorkDate,
  // 0.5 単位、上限は実用範囲で 99
  grantedDays: z.number().min(0).max(99),
  note: z.string().max(500).optional(),
})

export const RemoveLeaveGrantInputSchema = z.object({
  grantId: z.string().uuid(),
})

// 任意のタイミングで「雇入日 + 表参照」から不足分を auto 付与として補完
export const SyncAutoLeaveGrantsInputSchema = z.object({
  // 省略時は全メンバー対象
  userId: z.string().min(1).optional(),
})

export type CreateLeaveRequestInput = z.infer<typeof CreateLeaveRequestInputSchema>
export type CancelLeaveRequestInput = z.infer<typeof CancelLeaveRequestInputSchema>
export type ReviewLeaveRequestInput = z.infer<typeof ReviewLeaveRequestInputSchema>
export type AddLeaveGrantInput = z.infer<typeof AddLeaveGrantInputSchema>
export type RemoveLeaveGrantInput = z.infer<typeof RemoveLeaveGrantInputSchema>
export type SyncAutoLeaveGrantsInput = z.infer<
  typeof SyncAutoLeaveGrantsInputSchema
>
