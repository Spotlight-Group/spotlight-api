import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { UsersService } from '#auth/services/users_service'

@inject()
export default class ForgotPasswordController {
  constructor(private usersService: UsersService) {}

  /**
   * @forgotPassword
   * @summary Request password reset
   * @description Sends a password reset link to the user's email
   * @tag Authentication
   * @requestBody {"email": {"type": "string", "format": "email", "example": "user@example.com"}}
   * @responseBody 200 - {"message": "Password reset link sent successfully", "data": {"id": 1, "email": "user@example.com"}} - Reset link sent
   * @responseBody 404 - {"message": "User with this email address not found"} - User not found
   * @responseBody 500 - {"message": "An error occurred while sending the password reset link", "error": "..."} - Server error
   */
  async handle({ request, response, logger }: HttpContext) {
    const rawEmail = String(request.input('email') || '').toLowerCase()
    const emailMasked = rawEmail ? rawEmail.replace(/(.{2}).+(@.+)/, '$1***$2') : undefined
    logger.info({ event: 'password.reset.request.attempt', emailMasked })

    try {
      const user = await this.usersService.sendPasswordReset(rawEmail)

      if (!user) {
        logger.warn({ event: 'password.reset.request.user_not_found', emailMasked })
        return response.notFound({
          message: 'User with this email address not found',
        })
      }

      logger.info({ event: 'password.reset.request.sent', userId: user.id })
      return response.ok({
        message: 'Password reset link sent successfully',
        data: {
          id: user.id,
          email: user.email,
        },
      })
    } catch (error: any) {
      logger.error({ event: 'password.reset.request.error', err: error?.message })
      return response.internalServerError({
        message: 'An error occurred while sending the password reset link',
      })
    }
  }
}
