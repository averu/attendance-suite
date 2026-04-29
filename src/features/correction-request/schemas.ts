import { z } from 'zod'

const IsoDateTime = z.string().datetime({ offset: true })

export const ProposedBreakSchema = z.object({
  startAt: IsoDateTime,
  endAt: IsoDateTime.nullable(),
})

export const CorrectionRequestTypeSchema = z.enum(['edit', 'delete'])

export const CreateCorrectionRequestInputSchema = z.object({
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requestType: CorrectionRequestTypeSchema.optional().default('edit'),
  proposedClockInAt: IsoDateTime.nullable().optional().default(null),
  proposedClockOutAt: IsoDateTime.nullable().optional().default(null),
  proposedBreaks: z.array(ProposedBreakSchema).nullable().optional().default(null),
  reason: z.string().min(1).max(1000),
})

export const CancelCorrectionRequestInputSchema = z.object({
  requestId: z.string().uuid(),
})

export const ReviewCorrectionRequestInputSchema = z.object({
  requestId: z.string().uuid(),
  comment: z.string().max(1000).optional(),
})

export type CreateCorrectionRequestInput = z.infer<
  typeof CreateCorrectionRequestInputSchema
>
export type CancelCorrectionRequestInput = z.infer<
  typeof CancelCorrectionRequestInputSchema
>
export type ReviewCorrectionRequestInput = z.infer<
  typeof ReviewCorrectionRequestInputSchema
>
