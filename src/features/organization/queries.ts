import { queryOptions } from '@tanstack/react-query'
import { getJson } from '@/shared/lib/apiClient'
import type { Member, Invitation } from './types'

export const organizationQueries = {
  members: () =>
    queryOptions({
      queryKey: ['organization', 'members'],
      queryFn: () => getJson<{ members: Member[] }>('/api/organization/members'),
      select: (d) => d.members,
    }),
  invitations: () =>
    queryOptions({
      queryKey: ['organization', 'invitations'],
      queryFn: () =>
        getJson<{ invitations: Invitation[] }>('/api/organization/invitations'),
      select: (d) => d.invitations,
    }),
}
