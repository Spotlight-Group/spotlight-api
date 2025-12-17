import type { HttpContext } from '@adonisjs/core/http'
import { UsersService } from '#auth/services/users_service'
import User from '#auth/models/user'
import { OAuthProviders } from '#auth/enums/oauth_providers'
import { inject } from '@adonisjs/core'
import env from '#start/env'

@inject()
export default class OauthController {
  constructor(protected usersService: UsersService) {}

  /**
   * Maps provider string to OAuthProviders enum
   * @param provider - The provider string from the route parameter
   * @returns The corresponding OAuthProviders enum value
   * @throws Error if provider is not supported
   */
  private getProviderEnum(provider: string): OAuthProviders {
    const providerMap: Record<string, OAuthProviders> = {
      google: OAuthProviders.GOOGLE,
      facebook: OAuthProviders.FACEBOOK,
      twitter: OAuthProviders.TWITTER,
      github: OAuthProviders.GITHUB,
    }

    const providerEnum = providerMap[provider.toLowerCase()]
    if (!providerEnum) {
      throw new Error(`Unsupported OAuth provider: ${provider}`)
    }

    return providerEnum
  }

  /**
   * @oauthRedirect
   * @summary Redirect to OAuth provider
   * @description Redirects user to OAuth provider authorization page
   * @tag Authentication
   * @paramPath provider - The OAuth provider (google, facebook, twitter, github) - @type(string)
   * @responseBody 302 - Redirect to OAuth provider
   */
  async redirect({ ally, response, params, logger }: HttpContext): Promise<void> {
    try {
      const provider = params.provider
      logger.info({ event: 'oauth.redirect.attempt', provider })
      this.getProviderEnum(provider) // Validate provider

      const oauthProvider = ally.use(provider)
      return oauthProvider.redirect()
    } catch (error: any) {
      logger.error({
        event: 'oauth.redirect.error',
        provider: params.provider,
        err: error?.message,
      })
      return response.internalServerError({
        message: `Failed to redirect to ${params.provider} OAuth`,
      })
    }
  }

  /**
   * @oauthCallback
   * @summary Handle OAuth provider callback
   * @description Handles the callback from OAuth provider and logs in or registers the user
   * @tag Authentication
   * @paramPath provider - The OAuth provider (google, facebook, twitter, github) - @type(string)
   * @responseBody 200 - {"user": {"id": 1, "full_name": "John Doe", "email": "user@example.com"}, "token": {"type": "bearer", "value": "oat_1.abc123..."}} - OAuth login successful
   * @responseBody 400 - {"message": "OAuth authentication failed"} - OAuth failed
   */
  async callback({ ally, response, params, logger }: HttpContext): Promise<void> {
    try {
      const provider = params.provider
      logger.info({ event: 'oauth.callback.attempt', provider })
      const providerEnum = this.getProviderEnum(provider)

      const oauthProvider = ally.use(provider)

      if (oauthProvider.accessDenied()) {
        logger.warn({ event: 'oauth.callback.access_denied', provider })
        return response.badRequest({
          message: 'Access was denied',
        })
      }

      if (oauthProvider.stateMisMatch()) {
        logger.warn({ event: 'oauth.callback.state_mismatch', provider })
        return response.badRequest({
          message: 'Request expired. Retry again',
        })
      }

      if (oauthProvider.hasError()) {
        logger.warn({
          event: 'oauth.callback.provider_error',
          provider,
          detail: oauthProvider.getError(),
        })
        return response.badRequest({
          message: oauthProvider.getError(),
        })
      }

      const oauthUser = await oauthProvider.user()
      const emailMasked = oauthUser.email
        ? String(oauthUser.email)
            .toLowerCase()
            .replace(/(.{2}).+(@.+)/, '$1***$2')
        : undefined

      const user = await this.usersService.handleOAuthLoginOrRegister({
        providerName: providerEnum,
        providerId: oauthUser.id,
        email: oauthUser.email,
        fullName: oauthUser.name,
      })

      const token = await User.accessTokens.create(user)

      // Redirect to frontend with authentication data
      const frontendUrl = env.get('FRONTEND_URL')
      const redirectUrl = new URL('/auth/callback', frontendUrl)

      // Add user and token data as query parameters
      redirectUrl.searchParams.set('token', token.value!.release())
      redirectUrl.searchParams.set('user_id', user.id.toString())
      redirectUrl.searchParams.set('user_name', user.full_name)
      redirectUrl.searchParams.set('user_email', user.email)

      logger.info({ event: 'oauth.callback.success', provider, userId: user.id, emailMasked })
      return response.redirect(redirectUrl.toString())
    } catch (error: any) {
      logger.error({
        event: 'oauth.callback.error',
        provider: params.provider,
        err: error?.message,
      })
      return response.internalServerError({
        message: 'OAuth authentication failed',
      })
    }
  }

  /**
   * @oauthUnlink
   * @summary Unlink OAuth provider account
   * @description Unlinks the OAuth provider account from the current user
   * @tag Authentication
   * @paramPath provider - The OAuth provider (google, facebook, twitter, github) - @type(string)
   * @responseBody 200 - {"message": "Provider account unlinked successfully"} - Unlink successful
   * @responseBody 400 - {"message": "No provider account linked to this user"} - No account to unlink
   * @responseBody 401 - {"message": "Authentication required"} - Not authenticated
   */
  async unlink({ response, auth, params, logger }: HttpContext): Promise<void> {
    try {
      if (!auth.user) {
        logger.warn({ event: 'oauth.unlink.unauthenticated' })
        return response.unauthorized({
          message: 'Authentication required',
        })
      }

      const provider = params.provider
      logger.info({ event: 'oauth.unlink.attempt', provider, userId: auth.user.id })
      const providerEnum = this.getProviderEnum(provider)
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1)

      const success = await this.usersService.unlinkOAuthAccount(auth.user, providerEnum)

      if (!success) {
        logger.warn({ event: 'oauth.unlink.nothing_to_unlink', provider, userId: auth.user.id })
        return response.badRequest({
          message: `No ${providerName} account linked to this user`,
        })
      }

      logger.info({ event: 'oauth.unlink.success', provider, userId: auth.user.id })
      return response.ok({
        message: `${providerName} account unlinked successfully`,
      })
    } catch (error: any) {
      logger.error({ event: 'oauth.unlink.error', provider: params.provider, err: error?.message })
      return response.internalServerError({
        message: `Failed to unlink ${params.provider} account`,
      })
    }
  }
}
