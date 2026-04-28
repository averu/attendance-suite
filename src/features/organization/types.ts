export type Role = 'member' | 'admin' | 'owner'
export type InviteRole = 'member' | 'admin'

export type Member = {
  membershipId: string
  userId: string
  email: string
  name: string
  role: Role
  joinedAt: string
}

export type Invitation = {
  id: string
  email: string
  role: InviteRole
  token: string
  expiresAt: string
  acceptedAt: string | null
  invitedByName: string
  createdAt: string
}

export type Organization = {
  id: string
  name: string
  slug: string
  timezone: string
}
