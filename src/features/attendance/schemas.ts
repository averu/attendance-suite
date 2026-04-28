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

export type ListMyAttendanceInput = z.infer<typeof ListMyAttendanceInputSchema>
export type GetAttendanceDetailInput = z.infer<typeof GetAttendanceDetailInputSchema>
export type GetMemberAttendanceInput = z.infer<typeof GetMemberAttendanceInputSchema>
export type GetMemberAttendanceDetailInput = z.infer<
  typeof GetMemberAttendanceDetailInputSchema
>
