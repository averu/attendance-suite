import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { UnauthorizedError } from '@/shared/lib/errors'
import { auth } from '@/features/auth/server/auth.server'

/**
 * セッションを解決し context.user を注入。未ログインは UnauthorizedError。
 * client から渡された user_id は信用しない (CLAUDE.md ルール)。
 */
export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      throw new UnauthorizedError()
    }
    return next({
      context: {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        },
      },
    })
  },
)
