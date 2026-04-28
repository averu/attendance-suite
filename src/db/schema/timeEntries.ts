import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './auth'

export const timeEntryStatusEnum = pgEnum('time_entry_status', [
  'not_started',
  'working',
  'on_break',
  'finished',
])

export const timeEntries = pgTable(
  'time_entry',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workDate: date('work_date').notNull(), // 'YYYY-MM-DD' (JST)
    clockInAt: timestamp('clock_in_at', { withTimezone: true }),
    clockOutAt: timestamp('clock_out_at', { withTimezone: true }),
    status: timeEntryStatusEnum('status').notNull().default('not_started'),
    noteForUser: text('note_for_user'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqUserDate: uniqueIndex('time_entry_user_date_uniq').on(t.userId, t.workDate),
    byOrgDate: index('time_entry_org_date_idx').on(t.organizationId, t.workDate),
  }),
)

export type TimeEntry = typeof timeEntries.$inferSelect
export type TimeEntryStatus = TimeEntry['status']
