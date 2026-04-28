import {
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './auth'

/**
 * admin の直接編集の監査ログ。
 * - target: 編集対象 (user × workDate)
 * - actor: 編集を実行した admin/owner
 * - before / after: 編集前後の time_entry + breaks の snapshot (jsonb)
 */
export const attendanceAudits = pgTable(
  'attendance_audit',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    targetUserId: text('target_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workDate: date('work_date').notNull(),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    action: text('action').notNull(), // 'edit' | 'create' (将来 'delete' 等)
    // shape は AuditSnapshot (`{ entry: TimeEntry }`)。型は features/attendance/types で定義。
    beforeJson: jsonb('before_json').$type<{ entry: unknown } | null>(),
    afterJson: jsonb('after_json').$type<{ entry: unknown }>().notNull(),
    note: text('note'),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byOrgTarget: index('attendance_audit_org_target_idx').on(
      t.organizationId,
      t.targetUserId,
      t.workDate,
    ),
  }),
)

export type AttendanceAudit = typeof attendanceAudits.$inferSelect
