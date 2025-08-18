import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { UserRoles } from '#auth/enums/users'

/**
 * Admin middleware is used to authorize HTTP requests and deny
 * access to non-admin users.
 */
export default class AdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    // Ensure user is authenticated (should be handled by auth middleware first)
    const user = ctx.auth.user

    if (!user) {
      return ctx.response.unauthorized({ message: 'Authentication required' })
    }

    // Check if user has admin role
    if (user.role !== UserRoles.ADMIN) {
      return ctx.response.forbidden({
        message: 'Admin access required. This action is restricted to administrators only.',
      })
    }

    return next()
  }
}
