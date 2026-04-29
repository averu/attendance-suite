import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  uniqueIndex,
  date,
  integer,
  numeric,
} from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './auth'

export const roleEnum = pgEnum('role', ['member', 'admin', 'owner'])

// 労基法上の区分:
//   'general'        — 一般労働者 (8h/40h・60h・法定休日・深夜の全割増規定が適用)
//   'manager'        — 管理監督者 (労基法 41 条 2 号、労働時間・休日・休憩は適用除外、深夜のみ適用)
//   'discretionary'  — 裁量労働制 (みなし労働時間制)。みなし時間カラム未実装のため集計は general と同じ
//   'highly_skilled' — 高度プロフェッショナル (労基法 41 条の 2、労働時間・休日・深夜まで全部適用除外)
export const laborCategoryEnum = pgEnum('labor_category', [
  'general',
  'manager',
  'discretionary',
  'highly_skilled',
])

export const memberships = pgTable(
  'membership',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull().default('member'),
    // 労基法上の区分。manager は時間外/休日/60h超 の割増対象外、深夜のみ適用。
    laborCategory: laborCategoryEnum('labor_category').notNull().default('general'),
    // 裁量労働制の「みなし労働時間 (分)」。労使協定で定めた値。
    // null の場合は実労働ベース (general 同等)。laborCategory='discretionary' のときのみ意味を持つ。
    discretionaryDeemedMinutes: integer('discretionary_deemed_minutes'),
    // 有給算定の入力。未設定の間は残高計算をスキップ (UNCONFIGURED 扱い)。
    hireDate: date('hire_date'),
    weeklyScheduledDays: integer('weekly_scheduled_days'),
    weeklyScheduledHours: numeric('weekly_scheduled_hours', { precision: 4, scale: 1 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqOrgUser: uniqueIndex('membership_org_user_uniq').on(t.organizationId, t.userId),
  }),
)

export type Membership = typeof memberships.$inferSelect
