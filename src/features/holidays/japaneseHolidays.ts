// 日本の国民の祝日生成 (純関数)。
//
// 以下のルールで year (西暦) の祝日リストを返す:
//   - 固定日: 元日, 建国, 天皇誕生日 (2020-), 昭和, 憲法記念日, みどり, こども, 山, 文化, 勤労感謝
//   - 浮動月曜: 成人 (1月第2月), 海 (7月第3月), 敬老 (9月第3月), スポーツ (10月第2月)
//   - 春分・秋分: 1980-2099 用近似式
//   - 振替休日: 祝日が日曜なら次の非祝日に振替
//
// 注意: 国会で祝日法改正があった場合 (例: 即位の日特例) は手動調整が必要。
//        2024-2030 の生成結果は内閣府公開リストと一致することを想定。

export type JapaneseHoliday = {
  date: string // 'YYYY-MM-DD'
  name: string
}

const FIXED: ReadonlyArray<{ month: number; day: number; name: string }> = [
  { month: 1, day: 1, name: '元日' },
  { month: 2, day: 11, name: '建国記念の日' },
  { month: 2, day: 23, name: '天皇誕生日' },
  { month: 4, day: 29, name: '昭和の日' },
  { month: 5, day: 3, name: '憲法記念日' },
  { month: 5, day: 4, name: 'みどりの日' },
  { month: 5, day: 5, name: 'こどもの日' },
  { month: 8, day: 11, name: '山の日' },
  { month: 11, day: 3, name: '文化の日' },
  { month: 11, day: 23, name: '勤労感謝の日' },
]

const FLOATING_MONDAYS: ReadonlyArray<{
  month: number
  week: number
  name: string
}> = [
  { month: 1, week: 2, name: '成人の日' },
  { month: 7, week: 3, name: '海の日' },
  { month: 9, week: 3, name: '敬老の日' },
  { month: 10, week: 2, name: 'スポーツの日' },
]

function nthMondayOf(year: number, month1: number, n: number): number {
  const firstDow = new Date(Date.UTC(year, month1 - 1, 1)).getUTCDay() // 0=Sun
  const firstMondayDay = ((1 - firstDow + 7) % 7) + 1
  return firstMondayDay + (n - 1) * 7
}

function vernalEquinoxDay(year: number): number {
  // 1980-2099 用近似 (NAOJ 公開式と整合)
  return Math.floor(
    20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4),
  )
}

function autumnalEquinoxDay(year: number): number {
  return Math.floor(
    23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4),
  )
}

function fmt(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function dayOfWeek(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y as number, (m as number) - 1, d as number)).getUTCDay()
}

function nextDay(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y as number, (m as number) - 1, (d as number) + 1))
  return fmt(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

/**
 * 年単位 (西暦) で日本の祝日を生成する。1980-2099 の範囲で動作。
 * 結果は date 昇順、`振替休日` は元の祝日の翌平日 (非祝日まで送る)。
 */
export function generateJapaneseHolidays(year: number): JapaneseHoliday[] {
  const items: JapaneseHoliday[] = []
  for (const f of FIXED) items.push({ date: fmt(year, f.month, f.day), name: f.name })
  for (const fm of FLOATING_MONDAYS) {
    items.push({
      date: fmt(year, fm.month, nthMondayOf(year, fm.month, fm.week)),
      name: fm.name,
    })
  }
  items.push({ date: fmt(year, 3, vernalEquinoxDay(year)), name: '春分の日' })
  items.push({
    date: fmt(year, 9, autumnalEquinoxDay(year)),
    name: '秋分の日',
  })
  items.sort((a, b) => a.date.localeCompare(b.date))
  // 振替休日: 日曜祝日の翌非祝日
  const dateSet = new Set(items.map((h) => h.date))
  const subs: JapaneseHoliday[] = []
  for (const h of items) {
    if (dayOfWeek(h.date) !== 0) continue
    let next = nextDay(h.date)
    while (dateSet.has(next)) next = nextDay(next)
    subs.push({ date: next, name: '振替休日' })
    dateSet.add(next)
  }
  return [...items, ...subs].sort((a, b) => a.date.localeCompare(b.date))
}
