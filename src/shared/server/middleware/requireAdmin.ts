import { createMiddleware } from '@tanstack/react-start'
import { ForbiddenError } from '@/shared/lib/errors'
import { tenantMiddleware } from './tenant'

export const requireAdminMiddleware = createMiddleware({ type: 'function' })
  .middleware([tenantMiddleware])
  .server(async ({ next, context }) => {
    if (context.membership.role !== 'admin' && context.membership.role !== 'owner') {
      throw new ForbiddenError('REQUIRE_ADMIN')
    }
    return next()
  })
