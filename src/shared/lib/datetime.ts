// Asia/Tokyo 固定の日付ユーティリティ。
// MVP は JST 固定。将来 organization.timezone を引数に取る形に差し替え可能。

export const APP_TIMEZONE = 'Asia/Tokyo'

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const yearMonthFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
})

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** 'YYYY-MM-DD' (JST). */
export function formatDate(d: Date): string {
  return dateFormatter.format(d)
}

/** 'YYYY-MM' (JST). */
export function formatYearMonth(d: Date): string {
  return yearMonthFormatter.format(d).slice(0, 7)
}

/** 'HH:mm' (JST). */
export function formatTime(d: Date): string {
  return timeFormatter.format(d)
}

/** 今日の JST 日付 'YYYY-MM-DD'. */
export function today(): string {
  return formatDate(new Date())
}

/** 今月の JST 'YYYY-MM'. */
export function thisMonth(): string {
  return formatYearMonth(new Date())
}

/** 経過分数 (休憩込み総時間)。end が null なら now 基準。 */
export function diffMinutes(start: Date, end: Date | null): number {
  const e = end ?? new Date()
  return Math.max(0, Math.round((e.getTime() - start.getTime()) / 60_000))
}
