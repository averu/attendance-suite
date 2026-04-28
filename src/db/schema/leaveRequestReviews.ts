import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { leaveRequests } from './leaveRequests'
import { users } from './auth'
import { reviewDecisionEnum } from './correctionRequestReviews'

// reviewDecisionEnum は correction_request_review と同じ enum を再利用
export const leaveRequestReviews = pgTable('leave_request_review', {
  id: uuid('id').defaultRandom().primaryKey(),
  leaveRequestId: uuid('leave_request_id')
    .notNull()
    .references(() => leaveRequests.id, { onDelete: 'cascade' }),
  reviewerUserId: text('reviewer_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  decision: reviewDecisionEnum('decision').notNull(),
  comment: text('comment'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }).notNull().defaultNow(),
})

export type LeaveRequestReview = typeof leaveRequestReviews.$inferSelect
