// 労働法レイヤの基礎型 — DB / UI には依存しない pure spec layer.

/** 半開区間 [start, end) を表す時間帯。end > start を前提とする (空または逆転は呼び出し側責務)。 */
export type TimeRange = {
  start: Date
  end: Date
}

/** 1 日の打刻 (clockIn / clockOut)。clockOut === null は「未退勤」。 */
export type ShiftPunch = {
  clockInAt: Date
  clockOutAt: Date | null
}

/** 休憩セグメント。endAt === null は「休憩中」。 */
export type BreakSegment = {
  startAt: Date
  endAt: Date | null
}
