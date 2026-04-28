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

export type CreateLeaveRequestInput = z.infer<typeof CreateLeaveRequestInputSchema>
export type CancelLeaveRequestInput = z.infer<typeof CancelLeaveRequestInputSchema>
export type ReviewLeaveRequestInput = z.infer<typeof ReviewLeaveRequestInputSchema>
