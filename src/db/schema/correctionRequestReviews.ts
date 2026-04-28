import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { correctionRequests } from './correctionRequests'
import { users } from './auth'

export const reviewDecisionEnum = pgEnum('review_decision', ['approved', 'rejected'])

export const correctionRequestReviews = pgTable('correction_request_review', {
  id: uuid('id').defaultRandom().primaryKey(),
  correctionRequestId: uuid('correction_request_id')
    .notNull()
    .references(() => correctionRequests.id, { onDelete: 'cascade' }),
  reviewerUserId: text('reviewer_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  decision: reviewDecisionEnum('decision').notNull(),
  comment: text('comment'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }).notNull().defaultNow(),
})

export type CorrectionRequestReview = typeof correctionRequestReviews.$inferSelect
