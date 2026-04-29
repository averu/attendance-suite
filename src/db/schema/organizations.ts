import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core'

export const organizations = pgTable('organization', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  timezone: text('timezone').notNull().default('Asia/Tokyo'),
  // 1 日の所定労働時間 (分)。default 480 = 8h。労基法上は 8h 以下が法定。
  dailyScheduledMinutes: integer('daily_scheduled_minutes').notNull().default(480),
  // 1 週の所定労働時間 (分)。default 2400 = 40h。一部業種で 44h 特例あり。
  weeklyScheduledMinutes: integer('weekly_scheduled_minutes').notNull().default(2400),
  // 法定休日の曜日 (0=日, 1=月, ..., 6=土)。35% 割増対象日。default 0 (日曜)。
  legalHolidayDow: integer('legal_holiday_dow').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Organization = typeof organizations.$inferSelect
