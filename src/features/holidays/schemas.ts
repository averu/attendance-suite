import { z } from 'zod'

export const CreateHolidayInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  name: z.string().min(1).max(100),
})

export const DeleteHolidayInputSchema = z.object({
  id: z.string().uuid(),
})

// 一括登録: 重複 (org × date) は skip
export const BulkCreateHolidaysInputSchema = z.object({
  items: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
        name: z.string().min(1).max(100),
      }),
    )
    .min(1)
    .max(500),
})

export type CreateHolidayInput = z.infer<typeof CreateHolidayInputSchema>
export type DeleteHolidayInput = z.infer<typeof DeleteHolidayInputSchema>
export type BulkCreateHolidaysInput = z.infer<
  typeof BulkCreateHolidaysInputSchema
>
