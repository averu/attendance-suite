import type { ProposedBreak } from './types'

const TZ = 'Asia/Tokyo'
const TIME_FMT = new Intl.DateTimeFormat('ja-JP', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function fmtTime(iso: string): string {
  return TIME_FMT.format(new Date(iso))
}

/**
 * proposedBreaks を表示用文字列配列に整形する。
 *
 * - null / 空配列 → 空配列を返す (呼び出し側が "-" 等にフォールバックする)
 * - endAt が null のセグメント → "HH:MM〜" (休憩終了未指定)
 * - 通常 → "HH:MM〜HH:MM"
 *
 * 並びは入力順を保つ (DB 側で順序保証はしていないので呼び出し側で必要なら sort)。
 */
export function formatProposedBreaks(
  breaks: ReadonlyArray<ProposedBreak> | null,
): string[] {
  if (!breaks || breaks.length === 0) return []
  return breaks.map((b) =>
    b.endAt ? `${fmtTime(b.startAt)}〜${fmtTime(b.endAt)}` : `${fmtTime(b.startAt)}〜`,
  )
}
