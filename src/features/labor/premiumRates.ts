// 労基法 37 条に基づく割増賃金率の定数と組合せ計算。
//
// 「割増率」は基準内賃金 (時給) に「上乗せ」する率を表す。
// 例: 基本時給 1000 円 / 法定外残業 1h → 1000 × (1 + 0.25) = 1250 円
//
// 法律上の最低割増率:
//   法定時間外労働 (8h/40h 超):                25% 以上
//   そのうち月 60 時間超の部分:                  50% 以上 (中小企業も 2023/4 から適用)
//   深夜労働 (22:00-翌5:00):                   25% 以上
//   法定休日労働:                               35% 以上
//
// 重複適用 (同じ 1 分が複数該当する場合は加算):
//   法定外残業 + 深夜  = 25 + 25 = 50%
//   月 60h 超 + 深夜    = 50 + 25 = 75%
//   法定休日 + 深夜    = 35 + 25 = 60%
//
// 注意: 法定休日労働は「法定外残業」ではないので 60h 超ルールは適用されない (35% のまま)。

export const LEGAL_OVERTIME_PREMIUM = 0.25
export const OVER_60H_OVERTIME_PREMIUM = 0.5
export const LATE_NIGHT_PREMIUM = 0.25
export const LEGAL_HOLIDAY_PREMIUM = 0.35

export type PremiumAttrs = {
  /** 法定時間外 (8h/40h 超) に該当 */
  isLegalOvertime: boolean
  /** 月 60h 超の法定時間外に該当 */
  isOver60hLegalOvertime: boolean
  /** 深夜帯 (22:00-翌5:00) に該当 */
  isLateNight: boolean
  /** 法定休日労働に該当 */
  isLegalHoliday: boolean
}

/**
 * 割増率を組合せて返す。仕様:
 * - isLegalHoliday が true なら法定休日割増 (35%) のみベース。法定外残業ルール (25/50%) は適用しない。
 * - isLegalHoliday が false で isOver60hLegalOvertime が true なら 50% (over-60h は legalOvertime を含意するので排他的)
 * - isLegalHoliday が false で isLegalOvertime が true なら 25%
 * - isLateNight が true なら +25% (上記いずれの場合も加算)
 *
 * 戻り値は加算済の単一率 (0.25, 0.5, 0.6, 0.75 など)。基本給に乗じる「+α」値。
 */
export function computePremiumRate(attrs: PremiumAttrs): number {
  let rate = 0
  if (attrs.isLegalHoliday) {
    rate += LEGAL_HOLIDAY_PREMIUM
  } else if (attrs.isOver60hLegalOvertime) {
    rate += OVER_60H_OVERTIME_PREMIUM
  } else if (attrs.isLegalOvertime) {
    rate += LEGAL_OVERTIME_PREMIUM
  }
  if (attrs.isLateNight) {
    rate += LATE_NIGHT_PREMIUM
  }
  return rate
}
