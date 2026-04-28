import {
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './auth'

export const leaveTypeEnum = pgEnum('leave_type', [
  'paid_full', // 有給 (1 日)
  'paid_half_am', // 午前半休
  'paid_half_pm', // 午後半休
  'substitute', // 振替休日
  'special', // 特別休暇 (慶弔等)
  'sick', // 病気休暇
  'other',
])

export const leaveRequestStatusEnum = pgEnum('leave_request_status', [
  'pending',
  'approved',
  'rejected',
  'cancelled',
])

export const leaveRequests = pgTable(
  'leave_request',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    requesterUserId: text('requester_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    leaveType: leaveTypeEnum('leave_type').notNull(),
    startDate: date('start_date').notNull(), // 'YYYY-MM-DD' (JST)
    endDate: date('end_date').notNull(), // 単日なら start_date と同値
    reason: text('reason').notNull(),
    status: leaveRequestStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byOrgStatus: index('leave_request_org_status_idx').on(t.organizationId, t.status),
    byRequester: index('leave_request_requester_idx').on(t.requesterUserId),
  }),
)

export type LeaveRequest = typeof leaveRequests.$inferSelect
export type LeaveType = LeaveRequest['leaveType']
export type LeaveRequestStatus = LeaveRequest['status']
