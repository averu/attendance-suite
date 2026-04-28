import { pgTable, uuid, text, timestamp, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './auth'

export const roleEnum = pgEnum('role', ['member', 'admin', 'owner'])

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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqOrgUser: uniqueIndex('membership_org_user_uniq').on(t.organizationId, t.userId),
  }),
)

export type Membership = typeof memberships.$inferSelect
