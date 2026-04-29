import type { TimeRange } from './types'

// 労基法上の深夜帯: 22:00〜翌5:00 (JST)。
// プロジェクト前提: TZ は Asia/Tokyo 固定 (DST なしなので +9h オフセットで安全に算出可能)。
// 他 TZ 対応が必要になったら Intl.DateTimeFormat で曜日/時刻を取得する形にリファクタする。

const MS_PER_HOUR = 3_600_000
const MS_PER_DAY = 86_400_000
const JST_OFFSET_MS = 9 * MS_PER_HOUR
const NIGHT_START_HOUR = 22
const NIGHT_END_HOUR = 5 // 翌日

/** UTC ms から JST における通算日インデックス (1970-01-01 JST 0:00 を 0 として日数) を返す */
function jstDayIndex(utcMs: number): number {
  return Math.floor((utcMs + JST_OFFSET_MS) / MS_PER_DAY)
}

/** JST 通算日インデックス d の 0:00 JST を UTC ms で返す */
function jstDayStartUtcMs(d: number): number {
  return d * MS_PER_DAY - JST_OFFSET_MS
}

/**
 * 1 つの TimeRange (UTC) と「日 d の深夜帯 [22:00 JST, 翌 05:00 JST)」の重なり ms を返す。
 */
function overlapMsWithNightOfDay(range: TimeRange, d: number): number {
  const lo = range.start.getTime()
  const hi = range.end.getTime()
  const day0 = jstDayStartUtcMs(d)
  const nightStart = day0 + NIGHT_START_HOUR * MS_PER_HOUR
  const nightEnd = day0 + (24 + NIGHT_END_HOUR) * MS_PER_HOUR
  const s = Math.max(nightStart, lo)
  const e = Math.min(nightEnd, hi)
  return e > s ? e - s : 0
}

/**
 * 1 つの時間帯 [start, end) に含まれる「深夜帯 (22:00-05:00 JST)」の分数を返す。
 * 0:00 跨ぎ・複数日跨ぎでも正しく集計する。
 */
export function nightMinutesInRange(range: TimeRange): number {
  const lo = range.start.getTime()
  const hi = range.end.getTime()
  if (hi <= lo) return 0
  // range が触る可能性のある JST day は jstDayIndex(lo)-1 .. jstDayIndex(hi-1)。
  // d-1 を含めるのは「翌 5 時まで」が前日 d-1 の night band として表現されるため。
  const dStart = jstDayIndex(lo) - 1
  const dEnd = jstDayIndex(hi - 1)
  let totalMs = 0
  for (let d = dStart; d <= dEnd; d++) {
    totalMs += overlapMsWithNightOfDay(range, d)
  }
  return Math.round(totalMs / 60_000)
}

/** 複数 TimeRange の合計深夜分数 */
export function totalNightMinutes(
  segments: ReadonlyArray<TimeRange>,
): number {
  let m = 0
  for (const seg of segments) m += nightMinutesInRange(seg)
  return m
}
