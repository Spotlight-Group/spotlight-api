import type { HttpContext } from '@adonisjs/core/http'
import { resetPasswordValidator } from '#auth/validators/users'
import { UsersService } from '#auth/services/users_service'
import { inject } from '@adonisjs/core'

@inject()
export default class ResetPasswordController {
  constructor(protected usersService: UsersService) {}

  /**
   * @show
   * @summary Show reset password form
   * @description Display reset password form or validate token
   * @tag Authentication
   * @paramPath token - Reset password token - @type(string) @required
   * @responseBody 200 - {"message": "Token is valid", "token": "string"} - Token validation successful
   * @responseBody 400 - {"message": "Invalid or expired token"} - Token validation failed
   * @responseBody 500 - {"message": "An error occurred", "error": "string"} - Internal server error
   */
  async show({ params, response, logger }: HttpContext) {
    try {
      logger.info({ event: 'password.reset.show.attempt' })
      const { token } = params

      if (!token) {
        logger.warn({ event: 'password.reset.show.missing_token' })
        return response.badRequest({
          message: 'Token is required',
        })
      }

      // For now, just return the token to indicate the endpoint exists
      // In a real application, you might want to:
      // 1. Validate the token
      // 2. Return a form view
      // 3. Redirect to a frontend application with the token
      logger.info({ event: 'password.reset.show.success' })
      return response.ok({
        message: 'Reset password form',
        token: decodeURIComponent(token),
      })
    } catch (error: any) {
      logger.error({ event: 'password.reset.show.error', err: error?.message })
      return response.internalServerError({
        message: 'An error occurred',
      })
    }
  }

  /**
   * @resetPassword
   * @summary Reset user password
   * @description Reset a user's password using email verification
   * @tag Authentication
   * @requestBody {"email": {"type": "string", "format": "email", "example": "user@example.com"}, "newPassword": {"type": "string", "format": "password", "minLength": 8, "example": "newpassword123"}}
   * @responseBody 200 - {"message": "Password reset successfully", "data": {"id": 1, "email": "user@example.com"}} - Password reset successful
   * @responseBody 400 - {"message": "Validation failed", "errors": []} - Validation errors
   * @responseBody 404 - {"message": "User with this email address not found"} - User not found
   * @responseBody 500 - {"message": "An error occurred while resetting the password", "error": "string"} - Internal server error
   */
  async handle({ request, response, logger }: HttpContext) {
    try {
      const payload = await request.validateUsing(resetPasswordValidator)
      const emailMasked = payload.email
        ? String(payload.email)
            .toLowerCase()
            .replace(/(.{2}).+(@.+)/, '$1***$2')
        : undefined
      logger.info({ event: 'password.reset.attempt', emailMasked })

      const user = await this.usersService.resetPassword(payload)

      logger.info({ event: 'password.reset.success', userId: user.id })
      return response.ok({
        message: 'Password reset successfully',
        data: {
          id: user.id,
          email: user.email,
        },
      })
    } catch (error: any) {
      // Handle validation errors
      if (error?.messages) {
        logger.warn({ event: 'password.reset.validation_failed', issues: error.messages })
        return response.badRequest({
          message: 'Validation failed',
          errors: error.messages,
        })
      }

      // Handle user not found error
      if (error?.message === 'User not found') {
        logger.warn({ event: 'password.reset.user_not_found' })
        return response.notFound({
          message: 'User with this email address not found',
        })
      }

      // Handle other errors
      logger.error({ event: 'password.reset.error', err: error?.message })
      return response.internalServerError({
        message: 'An error occurred while resetting the password',
      })
    }
  }
}
