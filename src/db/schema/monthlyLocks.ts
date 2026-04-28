import { pgTable, uuid, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './auth'

/**
 * 月次締め後の編集禁止ロック。
 * (organization_id, year_month) で 1 件。これより前の月に対する打刻 / 申請は不可。
 */
export const monthlyLocks = pgTable(
  'monthly_lock',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    yearMonth: text('year_month').notNull(), // 'YYYY-MM'
    lockedByUserId: text('locked_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    lockedAt: timestamp('locked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqOrgMonth: uniqueIndex('monthly_lock_org_month_uniq').on(t.organizationId, t.yearMonth),
  }),
)

export type MonthlyLock = typeof monthlyLocks.$inferSelect
