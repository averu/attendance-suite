import { and, asc, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/shared/lib/db.server'
import { holidays } from '@/db/schema'
import type { ApiCallerContext } from '@/shared/server/apiAuth'
import type { HolidayDTO } from '../types'
import type { CreateHolidayInput, DeleteHolidayInput } from '../schemas'

function err(code: string): Error {
  const e = new Error(code)
  ;(e as { code?: string }).code = code
  return e
}

function lastDayOfMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const last = new Date(Date.UTC(y as number, m as number, 0)).getUTCDate()
  return `${yearMonth}-${String(last).padStart(2, '0')}`
}

export async function listHolidaysHandler(
  ctx: ApiCallerContext,
  yearMonth?: string,
): Promise<HolidayDTO[]> {
  const conditions = [eq(holidays.organizationId, ctx.organization.id)]
  if (yearMonth && /^\d{4}-\d{2}$/.test(yearMonth)) {
    // date 型は LIKE 不可なので範囲比較で月内に絞る
    conditions.push(gte(holidays.date, `${yearMonth}-01`))
    conditions.push(lte(holidays.date, lastDayOfMonth(yearMonth)))
  }
  const rows = await db
    .select()
    .from(holidays)
    .where(and(...conditions))
    .orderBy(asc(holidays.date))
  return rows.map((r) => ({ id: r.id, date: r.date, name: r.name }))
}

export async function createHolidayHandler(
  ctx: ApiCallerContext,
  input: CreateHolidayInput,
): Promise<{ id: string }> {
  try {
    const [row] = await db
      .insert(holidays)
      .values({
        organizationId: ctx.organization.id,
        date: input.date,
        name: input.name,
      })
      .returning()
    if (!row) throw err('INSERT_FAILED')
    return { id: row.id }
  } catch (e) {
    // unique 制約 (org × date) 違反は CONFLICT として返す
    const msg = (e as Error).message?.toLowerCase() ?? ''
    if (msg.includes('unique') || msg.includes('duplicate')) throw err('CONFLICT')
    throw e
  }
}

export async function deleteHolidayHandler(
  ctx: ApiCallerContext,
  input: DeleteHolidayInput,
): Promise<{ ok: true }> {
  const [row] = await db
    .select()
    .from(holidays)
    .where(eq(holidays.id, input.id))
    .limit(1)
  if (!row || row.organizationId !== ctx.organization.id) throw err('NOT_FOUND')
  await db.delete(holidays).where(eq(holidays.id, input.id))
  return { ok: true }
}
