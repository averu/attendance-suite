// 'YYYY-MM-DD' 文字列ベースの最小日付演算 (Asia/Tokyo 暗黙)。
// 月加算は月末クランプ (例: 2025-08-31 + 6m → 2026-02-28)。

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseYMD(s: string): [number, number, number] {
  const m = YMD_RE.exec(s)
  if (!m) throw new Error(`invalid YYYY-MM-DD: ${s}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

export function formatYMD(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function lastDayOfMonth(y: number, m1based: number): number {
  // Date.UTC(y, m, 0) returns the last day of month m (0-based)
  return new Date(Date.UTC(y, m1based, 0)).getUTCDate()
}

/** 月加算 (月末クランプ)。負の months も可。 */
export function addMonthsYMD(s: string, months: number): string {
  const [y, m, d] = parseYMD(s)
  const total = (m - 1) + months
  const newY = y + Math.floor(total / 12)
  const newM = ((total % 12) + 12) % 12 + 1
  const lastDay = lastDayOfMonth(newY, newM)
  return formatYMD(newY, newM, Math.min(d, lastDay))
}

export function addYearsYMD(s: string, years: number): string {
  return addMonthsYMD(s, years * 12)
}

/** YYYY-MM-DD は文字列比較で順序が保てるので localeCompare でよい */
export function compareYMD(a: string, b: string): number {
  return a.localeCompare(b)
}
