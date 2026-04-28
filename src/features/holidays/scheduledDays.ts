// 月の所定労働日数を計算する純関数。
// 仕様 (MVP):
//   - 平日 (月〜金) = 労働日候補
//   - 土日 = 自動的に休み (週休 2 日制前提)
//   - 公休/祝日マスタの日付を更に除外 (重複しても 1 日として扱う)

const SATURDAY = 6
const SUNDAY = 0

function daysInMonth(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(Date.UTC(y as number, m as number, 0)).getUTCDate()
}

function dayOfWeek(yearMonth: string, day: number): number {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(Date.UTC(y as number, (m as number) - 1, day)).getUTCDay()
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/**
 * yearMonth ('YYYY-MM') の所定労働日数を返す。
 * holidayDates: 'YYYY-MM-DD' 文字列配列 (順不同、重複可)
 */
export function scheduledWorkingDays(
  yearMonth: string,
  holidayDates: ReadonlyArray<string>,
): number {
  const total = daysInMonth(yearMonth)
  const holidaySet = new Set(
    holidayDates.filter((d) => d.startsWith(yearMonth + '-')),
  )
  let count = 0
  for (let day = 1; day <= total; day++) {
    const dow = dayOfWeek(yearMonth, day)
    if (dow === SATURDAY || dow === SUNDAY) continue
    const dateStr = `${yearMonth}-${pad(day)}`
    if (holidaySet.has(dateStr)) continue
    count += 1
  }
  return count
}
