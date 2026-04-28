// Server も Client も使う共通型 (server-only deps を引かないファイル)

export type Role = 'member' | 'admin' | 'owner'

export type AuthState = {
  user: { id: string; email: string; name: string } | null
  membership: { id: string; organizationId: string; role: Role } | null
  organization: { id: string; name: string; slug: string; timezone: string } | null
}
