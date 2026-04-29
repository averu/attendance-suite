// Server も Client も使う共通型 (server-only deps を引かないファイル)

export type Role = 'member' | 'admin' | 'owner'

export type AvailableOrganization = {
  id: string
  name: string
  slug: string
  role: Role
}

export type AuthState = {
  user: { id: string; email: string; name: string } | null
  membership: { id: string; organizationId: string; role: Role } | null
  organization: { id: string; name: string; slug: string; timezone: string } | null
  // 切替候補となる、その user が所属する全組織
  availableOrganizations: AvailableOrganization[]
}
