import type { HttpContext } from '@adonisjs/core/http'
import { loginValidator } from '#auth/validators/users'
import { UsersService } from '#auth/services/users_service'
import User from '#auth/models/user'
import { inject } from '@adonisjs/core'

@inject()
export default class LoginController {
  constructor(protected usersService: UsersService) {}

  /**
   * @login
   * @summary User login
   * @description Authenticate user with email and password
   * @tag Authentication
   * @requestBody {"email": {"type": "string", "format": "email", "example": "user@example.com"}, "password": {"type": "string", "format": "password", "example": "password123"}}
   * @responseBody 200 - {"user": {"id": 1, "full_name": "John Doe", "email": "user@example.com"}, "token": {"type": "bearer", "value": "oat_1.abc123..."}} - Login successful
   * @responseBody 400 - {"message": "You are already logged in"} - Already logged in
   * @responseBody 401 - {"message": "Invalid credentials"} - Invalid credentials
   */
  async handle({ request, response, auth, logger }: HttpContext): Promise<void> {
    const rawEmail = String(request.input('email') || '').toLowerCase()
    const emailMasked = rawEmail ? rawEmail.replace(/(.{2}).+(@.+)/, '$1***$2') : undefined
    logger.info({ event: 'user.login.attempt', emailMasked })

    // If a bearer token is present, attempt to authenticate to detect already logged-in state
    try {
      await auth.authenticate()
    } catch {}

    if (auth.user) {
      logger.warn({ event: 'user.login.already_logged_in', userId: auth.user.id })
      return response.status(400).json({
        message: 'You are already logged in',
      })
    }

    try {
      const { email, password } = await request.validateUsing(loginValidator)

      const user = await this.usersService.attempt(email, password)
      const token = await User.accessTokens.create(user)

      logger.info({ event: 'user.login.success', userId: user.id })
      return response.ok({
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
        },
        token, // do not log token value
      })
    } catch (error: any) {
      if (error?.messages) {
        logger.warn({ event: 'user.login.validation_failed', issues: error.messages })
        return response.unprocessableEntity({
          message: 'Validation failed',
          errors: error.messages,
        })
      }
      logger.warn({ event: 'user.login.invalid_credentials_or_error', err: error?.message })
      return response.unauthorized({ message: 'Invalid credentials' })
    }
  }
}
