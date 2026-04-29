import type { Member } from './types'

/**
 * member のクライアントサイドフィルタ。
 * - 大文字小文字無視
 * - 空白で分割した全 token がいずれかのフィールド (name / email / role) を部分一致でヒット
 */
export function searchMembers(members: Member[], query: string): Member[] {
  const tokens = query
    .trim()
    .toLowerCase()
    // 　 = 全角スペース。\s と並べて半/全角の空白で分割する
    .split(/[\s　]+/)
    .filter(Boolean)
  if (tokens.length === 0) return members
  return members.filter((m) => {
    const haystack = `${m.name} ${m.email} ${m.role}`.toLowerCase()
    return tokens.every((t) => haystack.includes(t))
  })
}
