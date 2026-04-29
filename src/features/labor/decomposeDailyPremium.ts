// 1 日分の workSegments を、割増賃金計算で必要な「分単位 8 バケット」に分配する。
//
// 入力:
//   - workSegments: 当該日の実労働区間 (時系列順、休憩控除済を想定)
//   - isLegalHoliday: その日が「法定休日」かどうか (35% 適用判定)
//   - carryInMonthlyLegalOTMinutes: 当該日より前の同月内で既に積み上がっている法定外残業分
//
// 出力 8 バケット:
//   withinLegalDaytime  / withinLegalNight                     (法定 8h 以内)
//   legalOvertimeUnder60Daytime / legalOvertimeUnder60Night    (法定外残業, 月 60h 以下)
//   legalOvertimeOver60Daytime  / legalOvertimeOver60Night     (法定外残業, 月 60h 超)
//   legalHolidayDaytime         / legalHolidayNight            (法定休日労働, 8h ルールは別建て)
//
// 注意: この関数は「日 8h 超」を法定外残業とみなす。週 40h 超のみで法定外になるケース
//       (例: 7h × 6 日 → 42h で 2h 法定外) は扱わない。月次集計レイヤで補正する。

import { LEGAL_DAILY_LIMIT_MINUTES } from './dailyOvertime'
import type { TimeRange } from './types'

const MS_PER_MIN = 60_000
const MS_PER_HOUR = 3_600_000
const JST_OFFSET_MS = 9 * MS_PER_HOUR
const NIGHT_START_HOUR = 22
const NIGHT_END_HOUR = 5
const LEGAL_DAILY_LIMIT_MS = LEGAL_DAILY_LIMIT_MINUTES * MS_PER_MIN
const MONTHLY_60H_MS = 60 * 60 * MS_PER_MIN

export type DailyPremiumDecomposition = {
  withinLegalDaytimeMinutes: number
  withinLegalNightMinutes: number
  legalOvertimeUnder60DaytimeMinutes: number
  legalOvertimeUnder60NightMinutes: number
  legalOvertimeOver60DaytimeMinutes: number
  legalOvertimeOver60NightMinutes: number
  legalHolidayDaytimeMinutes: number
  legalHolidayNightMinutes: number
}

/**
 * 労基法上の労働者区分。割増賃金 / 残業集計の適用範囲を決める。
 *   'general'        — 一般。8h/40h, 60h, 法定休日, 深夜の各割増を適用
 *   'manager'        — 管理監督者 (労基法 41 条 2 号)。労働時間・休日は除外、深夜のみ適用
 *   'discretionary'  — 裁量労働制。みなし時間カラム未実装のため本実装は general と同じ
 *   'highly_skilled' — 高度プロフェッショナル (労基法 41 条の 2)。深夜含めて全免除
 */
export type LaborCategory =
  | 'general'
  | 'manager'
  | 'discretionary'
  | 'highly_skilled'

/** 指定 UTC ms が JST における深夜帯 (22:00-05:00) に該当するか */
function isInNightBand(utcMs: number): boolean {
  const h = new Date(utcMs + JST_OFFSET_MS).getUTCHours()
  return h >= NIGHT_START_HOUR || h < NIGHT_END_HOUR
}

/**
 * 1 区間を「夜帯境界 (22:00, 05:00 JST)」で分割して time 順に返す。
 * 各サブ区間の isNight はその区間の任意時点 (= start) で評価した値で一定。
 */
function subdivideByNightBand(
  range: TimeRange,
): Array<{ start: number; end: number; isNight: boolean }> {
  const lo = range.start.getTime()
  const hi = range.end.getTime()
  if (hi <= lo) return []
  // range が触る JST 日のループから、22:00 と 05:00 の境界 (ms) を集める
  const dStart = Math.floor((lo + JST_OFFSET_MS) / 86_400_000)
  const dEnd = Math.floor((hi - 1 + JST_OFFSET_MS) / 86_400_000)
  const boundaries: number[] = []
  for (let d = dStart - 1; d <= dEnd + 1; d++) {
    const day0 = d * 86_400_000 - JST_OFFSET_MS
    for (const h of [NIGHT_START_HOUR, NIGHT_END_HOUR]) {
      const t = day0 + h * MS_PER_HOUR
      if (t > lo && t < hi) boundaries.push(t)
    }
  }
  boundaries.sort((a, b) => a - b)
  const out: Array<{ start: number; end: number; isNight: boolean }> = []
  let cursor = lo
  for (const b of boundaries) {
    if (b > cursor) {
      out.push({ start: cursor, end: b, isNight: isInNightBand(cursor) })
      cursor = b
    }
  }
  if (hi > cursor) {
    out.push({ start: cursor, end: hi, isNight: isInNightBand(cursor) })
  }
  return out
}

export function decomposeDailyPremium(
  workSegments: ReadonlyArray<TimeRange>,
  isLegalHoliday: boolean,
  carryInMonthlyLegalOTMinutes: number = 0,
  laborCategory: LaborCategory = 'general',
): {
  decomposition: DailyPremiumDecomposition
  dailyLegalOvertimeMinutes: number
} {
  // 高度プロフェッショナル (41 条の 2): 労働時間・休日・**深夜含めて**全免除。
  //   全バケットを 0 にして実労働時間も計上しない (時間集計の対象外)。
  //   合計分 / 深夜分も 0 として返るので summary も「-」に近い表示になる。
  if (laborCategory === 'highly_skilled') {
    return {
      decomposition: {
        withinLegalDaytimeMinutes: 0,
        withinLegalNightMinutes: 0,
        legalOvertimeUnder60DaytimeMinutes: 0,
        legalOvertimeUnder60NightMinutes: 0,
        legalOvertimeOver60DaytimeMinutes: 0,
        legalOvertimeOver60NightMinutes: 0,
        legalHolidayDaytimeMinutes: 0,
        legalHolidayNightMinutes: 0,
      },
      dailyLegalOvertimeMinutes: 0,
    }
  }

  // 管理監督者 (41 条 2 号): 労働時間・休日に関する割増は適用除外。
  //   - 8h/40h 超 / 60h 超 / 法定休日割増 すべて 0
  //   - 深夜帯のみ within night バケットに集計 (深夜割増 25% は適用)
  if (laborCategory === 'manager') {
    const ms = { withinLegalDaytime: 0, withinLegalNight: 0 }
    for (const seg of workSegments) {
      for (const sub of subdivideByNightBand(seg)) {
        const len = sub.end - sub.start
        if (len <= 0) continue
        if (sub.isNight) ms.withinLegalNight += len
        else ms.withinLegalDaytime += len
      }
    }
    return {
      decomposition: {
        withinLegalDaytimeMinutes: Math.round(ms.withinLegalDaytime / MS_PER_MIN),
        withinLegalNightMinutes: Math.round(ms.withinLegalNight / MS_PER_MIN),
        legalOvertimeUnder60DaytimeMinutes: 0,
        legalOvertimeUnder60NightMinutes: 0,
        legalOvertimeOver60DaytimeMinutes: 0,
        legalOvertimeOver60NightMinutes: 0,
        legalHolidayDaytimeMinutes: 0,
        legalHolidayNightMinutes: 0,
      },
      dailyLegalOvertimeMinutes: 0,
    }
  }
  // 内部は ms で集計し、最後に分に丸める (累積誤差回避)
  const ms = {
    withinLegalDaytime: 0,
    withinLegalNight: 0,
    legalOvertimeUnder60Daytime: 0,
    legalOvertimeUnder60Night: 0,
    legalOvertimeOver60Daytime: 0,
    legalOvertimeOver60Night: 0,
    legalHolidayDaytime: 0,
    legalHolidayNight: 0,
  }
  let dayWorkedMs = 0
  let monthlyOTMs = Math.max(0, carryInMonthlyLegalOTMinutes) * MS_PER_MIN

  for (const seg of workSegments) {
    const subs = subdivideByNightBand(seg)
    for (const sub of subs) {
      let remaining = sub.end - sub.start
      if (remaining <= 0) continue

      // 法定休日: 8h ルール / 60h ルールは適用せず一律で legalHoliday バケットへ
      if (isLegalHoliday) {
        if (sub.isNight) ms.legalHolidayNight += remaining
        else ms.legalHolidayDaytime += remaining
        continue
      }

      // 平日 / 所定休日 — 法定 8h 以内の部分を先に消化
      if (dayWorkedMs < LEGAL_DAILY_LIMIT_MS) {
        const available = LEGAL_DAILY_LIMIT_MS - dayWorkedMs
        const consume = Math.min(remaining, available)
        if (sub.isNight) ms.withinLegalNight += consume
        else ms.withinLegalDaytime += consume
        dayWorkedMs += consume
        remaining -= consume
      }

      // OT 部分を 60h 累積閾値で分割
      while (remaining > 0) {
        if (monthlyOTMs < MONTHLY_60H_MS) {
          const available = MONTHLY_60H_MS - monthlyOTMs
          const consume = Math.min(remaining, available)
          if (sub.isNight) ms.legalOvertimeUnder60Night += consume
          else ms.legalOvertimeUnder60Daytime += consume
          monthlyOTMs += consume
          dayWorkedMs += consume
          remaining -= consume
        } else {
          if (sub.isNight) ms.legalOvertimeOver60Night += remaining
          else ms.legalOvertimeOver60Daytime += remaining
          monthlyOTMs += remaining
          dayWorkedMs += remaining
          remaining = 0
        }
      }
    }
  }

  const decomposition: DailyPremiumDecomposition = {
    withinLegalDaytimeMinutes: Math.round(ms.withinLegalDaytime / MS_PER_MIN),
    withinLegalNightMinutes: Math.round(ms.withinLegalNight / MS_PER_MIN),
    legalOvertimeUnder60DaytimeMinutes: Math.round(
      ms.legalOvertimeUnder60Daytime / MS_PER_MIN,
    ),
    legalOvertimeUnder60NightMinutes: Math.round(
      ms.legalOvertimeUnder60Night / MS_PER_MIN,
    ),
    legalOvertimeOver60DaytimeMinutes: Math.round(
      ms.legalOvertimeOver60Daytime / MS_PER_MIN,
    ),
    legalOvertimeOver60NightMinutes: Math.round(
      ms.legalOvertimeOver60Night / MS_PER_MIN,
    ),
    legalHolidayDaytimeMinutes: Math.round(ms.legalHolidayDaytime / MS_PER_MIN),
    legalHolidayNightMinutes: Math.round(ms.legalHolidayNight / MS_PER_MIN),
  }
  const dailyLegalOvertimeMinutes =
    decomposition.legalOvertimeUnder60DaytimeMinutes +
    decomposition.legalOvertimeUnder60NightMinutes +
    decomposition.legalOvertimeOver60DaytimeMinutes +
    decomposition.legalOvertimeOver60NightMinutes
  return { decomposition, dailyLegalOvertimeMinutes }
}
