import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  pgEnum,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './auth'

export const correctionRequestStatusEnum = pgEnum('correction_request_status', [
  'pending',
  'approved',
  'rejected',
  'cancelled',
])

export type ProposedBreak = {
  startAt: string // ISO timestamp
  endAt: string | null
}

export const correctionRequests = pgTable(
  'correction_request',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    requesterUserId: text('requester_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetDate: date('target_date').notNull(),
    proposedClockInAt: timestamp('proposed_clock_in_at', { withTimezone: true }),
    proposedClockOutAt: timestamp('proposed_clock_out_at', { withTimezone: true }),
    proposedBreaks: jsonb('proposed_breaks').$type<ProposedBreak[] | null>(),
    reason: text('reason').notNull(),
    status: correctionRequestStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byOrgStatus: index('correction_request_org_status_idx').on(t.organizationId, t.status),
    byRequester: index('correction_request_requester_idx').on(t.requesterUserId),
  }),
)

export type CorrectionRequest = typeof correctionRequests.$inferSelect
