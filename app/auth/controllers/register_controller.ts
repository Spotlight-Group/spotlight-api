import type { HttpContext } from '@adonisjs/core/http'
import { registerValidator } from '#auth/validators/users'
import { UsersService } from '#auth/services/users_service'
import User from '#auth/models/user'
import { inject } from '@adonisjs/core'

@inject()
export default class RegisterController {
  constructor(protected usersService: UsersService) {}

  /**
   * @register
   * @summary User registration
   * @description Register a new user account
   * @tag Authentication
   * @requestBody {"full_name": {"type": "string", "minLength": 3, "maxLength": 255, "example": "John Doe"}, "email": {"type": "string", "format": "email", "example": "user@example.com"}, "password": {"type": "string", "format": "password", "minLength": 8, "maxLength": 255, "example": "password123"}, "bannerUrl": {"type": "string", "format": "uri", "example": "https://example.com/banner.jpg"}}
   * @responseBody 201 - {"user": {"id": 1, "full_name": "John Doe", "email": "user@example.com"}, "token": {"type": "bearer", "value": "oat_1.abc123..."}} - Registration successful
   * @responseBody 400 - {"message": "You are already logged in"} - Already logged in
   * @responseBody 422 - {"message": "Validation failed", "errors": []} - Validation error
   */
  async handle({ request, response, auth, logger }: HttpContext) {
    const email = String(request.input('email') || '').toLowerCase()
    const emailMasked = email ? email.replace(/(.{2}).+(@.+)/, '$1***$2') : undefined
    logger.info({ event: 'user.register.attempt', emailMasked })

    if (auth.user) {
      logger.warn({ event: 'user.register.already_logged_in', userId: auth.user.id })
      return response.status(400).json({
        message: 'You are already logged in',
      })
    }

    try {
      const data = await request.validateUsing(registerValidator)

      const user = await this.usersService.register(data)
      const token = await User.accessTokens.create(user)

      logger.info({ event: 'user.register.success', userId: user.id })
      return response.created({
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
        },
        token, // do not log token value
      })
    } catch (error: any) {
      // Handle validation errors
      if (error?.messages) {
        logger.warn({ event: 'user.register.validation_failed', issues: error.messages })
        return response.unprocessableEntity({
          message: 'Validation failed',
          errors: error.messages,
        })
      }

      // Handle other errors
      logger.error({ event: 'user.register.error', err: error?.message })
      return response.internalServerError({
        message: 'An error occurred while registering the user',
      })
    }
  }
}
