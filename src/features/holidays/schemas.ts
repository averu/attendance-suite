import { z } from 'zod'

export const CreateHolidayInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  name: z.string().min(1).max(100),
})

export const DeleteHolidayInputSchema = z.object({
  id: z.string().uuid(),
})

export type CreateHolidayInput = z.infer<typeof CreateHolidayInputSchema>
export type DeleteHolidayInput = z.infer<typeof DeleteHolidayInputSchema>
