import {
  date,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { organizations } from './organizations'

/**
 * 組織ごとの公休 / 祝日マスタ。
 * - 月の所定労働日数 = (月の日数 - 公休日数 - 各人の week 公休)
 * - MVP では「会社全体の特定日」を登録する方式 (週固定休 / シフト休は対象外)
 */
export const holidays = pgTable(
  'holiday',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    date: date('date').notNull(), // 'YYYY-MM-DD'
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqOrgDate: uniqueIndex('holiday_org_date_uniq').on(t.organizationId, t.date),
  }),
)

export type Holiday = typeof holidays.$inferSelect
