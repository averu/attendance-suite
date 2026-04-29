import type { BreakSegment, ShiftPunch, TimeRange } from './types'

/**
 * 1 シフトの実労働セグメント (休憩を引き、未終了は fallbackEnd で打ち切った半開区間配列) を返す。
 *
 * 仕様:
 * - clockIn が null なら空配列 (出勤打刻がなければ就業時間ゼロ)
 * - clockOut が null なら fallbackEnd で打ち切る (未退勤を「いま」基準で集計するため)
 * - shift 範囲外の break は無視
 * - shift 範囲を跨ぐ break は範囲内にクリップ
 * - 終了未指定 break (endAt=null) は shift 終端 (clockOut または fallbackEnd) まで休憩扱い。
 *   clockOut が設定済なのに break が open のままはデータ不整合なので「shift 終端で閉じた」とみなす。
 * - break が重なる場合は union を取って二重計上を避ける
 *
 * 戻り値: 時系列順に並んだ実労働区間配列 (空区間は除外)。
 */
export function deriveWorkSegments(
  shift: ShiftPunch,
  breaks: ReadonlyArray<BreakSegment>,
  fallbackEnd: Date,
): TimeRange[] {
  const shiftStart = shift.clockInAt
  const shiftEndCandidate = shift.clockOutAt ?? fallbackEnd
  // clockIn 未刻 or end<=start なら無効
  if (!shiftStart || shiftEndCandidate.getTime() <= shiftStart.getTime()) {
    return []
  }

  // breaks を [start,end) のミリ秒タプルに正規化し shift 範囲にクリップ
  const lo = shiftStart.getTime()
  const hi = shiftEndCandidate.getTime()
  const ranges: Array<[number, number]> = []
  for (const b of breaks) {
    const bs = b.startAt.getTime()
    // open break (endAt=null) は shift 終端で閉じる扱い (上記 doc の policy)
    const be = b.endAt ? b.endAt.getTime() : hi
    if (be <= bs) continue
    const s = Math.max(bs, lo)
    const e = Math.min(be, hi)
    if (e > s) ranges.push([s, e])
  }
  // 重なる break を union (start で sort して merge)
  ranges.sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) {
      last[1] = Math.max(last[1], r[1])
    } else {
      merged.push([r[0], r[1]])
    }
  }
  // shift から merged break を引いた補集合を返す
  const result: TimeRange[] = []
  let cursor = lo
  for (const [bs, be] of merged) {
    if (bs > cursor) {
      result.push({ start: new Date(cursor), end: new Date(bs) })
    }
    cursor = Math.max(cursor, be)
  }
  if (hi > cursor) {
    result.push({ start: new Date(cursor), end: new Date(hi) })
  }
  return result
}

/** segments の合計分数 (端数は ms→分の整数切り捨てなしで保持、最後に Math.round)。 */
export function totalMinutes(segments: ReadonlyArray<TimeRange>): number {
  let ms = 0
  for (const s of segments) ms += s.end.getTime() - s.start.getTime()
  return Math.round(ms / 60_000)
}
