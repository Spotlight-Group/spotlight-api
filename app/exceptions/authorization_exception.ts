import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

export default class AuthorizationException extends Exception {
  static status = 403
  static code = 'E_AUTHORIZATION_FAILED'

  /**
   * Handle the exception and return a JSON response
   */
  async handle(error: this, ctx: HttpContext) {
    ctx.response.status(error.status).json({
      message: error.message,
      code: error.code || AuthorizationException.code,
    })
  }
}
