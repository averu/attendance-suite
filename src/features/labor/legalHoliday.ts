// 法定休日 (労基法 35 条) 判定。
// 法定休日は会社が就業規則で曜日 (例: 日曜) を定める運用が一般的。
// この関数は「曜日ベース」のみ対応。4 週 4 日制 (変形休日制) は別途。

const MS_PER_HOUR = 3_600_000
const JST_OFFSET_MS = 9 * MS_PER_HOUR

export type LegalHolidayPolicy = {
  /** 0=日, 1=月, 2=火, 3=水, 4=木, 5=金, 6=土。default は会社設定 (慣例的に 0=日曜) */
  legalHolidayDow: number
}

/** JS Date を JST 曜日 (0=Sun..6=Sat) に変換する。Asia/Tokyo は DST なしなので +9h で正確 */
export function jstDayOfWeek(d: Date): number {
  return new Date(d.getTime() + JST_OFFSET_MS).getUTCDay()
}

/**
 * date が JST における法定休日に該当するか。
 * date は Date object。policy.legalHolidayDow と JST 曜日を比較する。
 */
export function isLegalHoliday(date: Date, policy: LegalHolidayPolicy): boolean {
  return jstDayOfWeek(date) === policy.legalHolidayDow
}
