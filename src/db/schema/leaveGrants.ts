import {
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './auth'

// 'auto' = 雇入日 + 表参照で自動生成、'manual' = admin が直接登録 (繰越分など初期設定用)
export const leaveGrantSourceEnum = pgEnum('leave_grant_source', [
  'auto',
  'manual',
])

export const leaveGrants = pgTable(
  'leave_grant',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    grantDate: date('grant_date').notNull(), // 'YYYY-MM-DD' (JST)
    // 0.5 単位の半休消化や調整に備えて小数 (precision 5, scale 1: 0.0 ~ 9999.9)
    grantedDays: numeric('granted_days', { precision: 5, scale: 1 }).notNull(),
    source: leaveGrantSourceEnum('source').notNull().default('manual'),
    note: text('note'),
    createdByUserId: text('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqUserDate: uniqueIndex('leave_grant_user_date_uniq').on(
      t.organizationId,
      t.userId,
      t.grantDate,
    ),
    byOrgUser: index('leave_grant_org_user_idx').on(t.organizationId, t.userId),
  }),
)

export type LeaveGrantRow = typeof leaveGrants.$inferSelect
export type LeaveGrantSource = LeaveGrantRow['source']
