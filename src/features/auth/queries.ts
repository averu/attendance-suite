import { queryOptions } from '@tanstack/react-query'
import { getAuthState } from './getAuthState'

export const authQueries = {
  session: () =>
    queryOptions({
      queryKey: ['auth', 'session'],
      queryFn: () => getAuthState(),
      staleTime: 30_000,
    }),
}
