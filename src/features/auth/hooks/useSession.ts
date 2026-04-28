import { useSuspenseQuery } from '@tanstack/react-query'
import { authQueries } from '../queries'

export function useSession() {
  return useSuspenseQuery(authQueries.session())
}
