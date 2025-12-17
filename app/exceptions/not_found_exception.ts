import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

export default class NotFoundException extends Exception {
  static status = 404
  static code = 'E_NOT_FOUND'

  /**
   * Handle the exception and return a JSON response
   */
  async handle(error: this, ctx: HttpContext) {
    ctx.response.status(error.status).json({
      message: error.message,
      code: error.code || NotFoundException.code,
    })
  }
}
