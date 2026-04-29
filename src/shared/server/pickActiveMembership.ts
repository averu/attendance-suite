// active organization 選択ロジック。pure 関数として切り出し、resolveCaller から呼ばれる。
// item の shape を想定しないよう、organizationId 抽出関数を渡す形にする。

/**
 * preference にある activeOrganizationId と memberships 配列から、
 * 採用する membership を選ぶ。
 *
 * 優先順:
 *   1. preference.activeOrganizationId が指定 + その organization に membership がある → それ
 *   2. なければ memberships の先頭 (呼び出し側で createdAt asc 等の順序で渡す前提)
 *   3. memberships が空なら null
 *
 * getOrganizationId: 各 item から organizationId を取り出す関数 (例: (r) => r.m.organizationId)
 */
export function pickActiveMembership<M>(
  memberships: ReadonlyArray<M>,
  activeOrganizationId: string | null | undefined,
  getOrganizationId: (m: M) => string,
): M | null {
  if (memberships.length === 0) return null
  if (activeOrganizationId) {
    const found = memberships.find(
      (m) => getOrganizationId(m) === activeOrganizationId,
    )
    if (found) return found
  }
  return memberships[0] ?? null
}
