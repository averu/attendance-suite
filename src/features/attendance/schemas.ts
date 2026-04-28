import { z } from 'zod'

export const YearMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM 形式')

export const WorkDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 形式')

export const ListMyAttendanceInputSchema = z.object({
  yearMonth: YearMonthSchema,
})

export const GetAttendanceDetailInputSchema = z.object({
  workDate: WorkDateSchema,
})

export const GetMemberAttendanceInputSchema = z.object({
  userId: z.string().min(1),
  yearMonth: YearMonthSchema,
})

export const GetMemberAttendanceDetailInputSchema = z.object({
  userId: z.string().min(1),
  workDate: WorkDateSchema,
})

const IsoDateTime = z.string().datetime({ offset: true })

export const EditBreakInputSchema = z.object({
  startAt: IsoDateTime,
  endAt: IsoDateTime,
})

// 勤怠の直接編集 (admin+ 限定)。修正申請を経由せず即時反映。
// 月次締めロック中の月の workDate は server で拒否される。
export const EditAttendanceEntryInputSchema = z
  .object({
    userId: z.string().min(1),
    workDate: WorkDateSchema,
    clockInAt: IsoDateTime.nullable(),
    clockOutAt: IsoDateTime.nullable(),
    breaks: z.array(EditBreakInputSchema).max(20).default([]),
    note: z.string().max(500).optional(),
  })
  .refine(
    (v) => !v.clockOutAt || !!v.clockInAt,
    { message: '退勤時刻は出勤時刻が必要です', path: ['clockOutAt'] },
  )
  .refine(
    (v) =>
      !v.clockInAt ||
      !v.clockOutAt ||
      new Date(v.clockOutAt).getTime() > new Date(v.clockInAt).getTime(),
    { message: '退勤は出勤より後である必要があります', path: ['clockOutAt'] },
  )

export type ListMyAttendanceInput = z.infer<typeof ListMyAttendanceInputSchema>
export type GetAttendanceDetailInput = z.infer<typeof GetAttendanceDetailInputSchema>
export type GetMemberAttendanceInput = z.infer<typeof GetMemberAttendanceInputSchema>
export type GetMemberAttendanceDetailInput = z.infer<
  typeof GetMemberAttendanceDetailInputSchema
>
export type EditAttendanceEntryInput = z.infer<typeof EditAttendanceEntryInputSchema>
