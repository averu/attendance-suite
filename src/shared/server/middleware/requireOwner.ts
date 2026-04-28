import { createMiddleware } from '@tanstack/react-start'
import { ForbiddenError } from '@/shared/lib/errors'
import { tenantMiddleware } from './tenant'

export const requireOwnerMiddleware = createMiddleware({ type: 'function' })
  .middleware([tenantMiddleware])
  .server(async ({ next, context }) => {
    if (context.membership.role !== 'owner') {
      throw new ForbiddenError('REQUIRE_OWNER')
    }
    return next()
  })
