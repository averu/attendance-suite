import { pgTable, uuid, timestamp, index } from 'drizzle-orm/pg-core'
import { timeEntries } from './timeEntries'

export const breaks = pgTable(
  'break',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    timeEntryId: uuid('time_entry_id')
      .notNull()
      .references(() => timeEntries.id, { onDelete: 'cascade' }),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }), // null なら休憩中
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byEntry: index('break_entry_idx').on(t.timeEntryId),
  }),
)

export type Break = typeof breaks.$inferSelect
