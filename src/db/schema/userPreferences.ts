import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './auth'

/**
 * user 単位の preference。MVP では active_organization_id だけを持つ。
 * - 複数組織所属時の現在のアクティブ組織を保持
 * - レコードが無い / null なら最初の membership にフォールバック (apiAuth.resolveCaller 参照)
 */
export const userPreferences = pgTable('user_preference', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  activeOrganizationId: uuid('active_organization_id').references(
    () => organizations.id,
    { onDelete: 'set null' },
  ),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type UserPreference = typeof userPreferences.$inferSelect
