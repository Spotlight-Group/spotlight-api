import User from '#auth/models/user'
import OAuthProvider from '#auth/models/oauth_provider'
import { OAuthProviders } from '#auth/enums/oauth_providers'
import { UserRoles } from '#auth/enums/users'
import { MultipartFile } from '@adonisjs/core/bodyparser'
import { inject } from '@adonisjs/core'
import { DriveService } from '#core/services/drive_service'
import { EmailsService } from '#auth/services/emails_service'

export interface UpdateUserData {
  full_name?: string
  email?: string
  password?: string
  bannerUrl?: string
}

export interface ResetPasswordData {
  email: string
  newPassword: string
}

@inject()
export class UsersService {
  private readonly UPLOADS_PATH = 'uploads/users'
  private readonly ALLOWED_BANNER_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
  private readonly DEFAULT_BANNER_URL_TEMPLATE =
    'https://unavatar.io/{email}?fallback=https://avatar.vercel.sh/{fullName}?size=128'

  constructor(
    private driveService: DriveService = new DriveService(),
    private emailsService: EmailsService = new EmailsService()
  ) {}

  /**
   * Attempts to authenticate a user with the given email and password.
   * @param {string} email - The user's email address.
   * @param {string} password - The user's password.
   * @returns {Promise<User>} - The authenticated user.
   */
  async attempt(email: string, password: string): Promise<User> {
    return await User.verifyCredentials(email, password)
  }

  /**
   * Registers a new user with the provided data.
   * @param {Partial<User>} data - The user data to register.
   * @returns {Promise<User>} - The registered user.
   */
  async register(data: Partial<User>): Promise<User> {
    const bannerUrl =
      data.bannerUrl ??
      this.DEFAULT_BANNER_URL_TEMPLATE.replace('{email}', data.email || '').replace(
        '{fullName}',
        data.full_name || ''
      )

    return await User.create({
      ...data,
      bannerUrl,
      role: data.role || UserRoles.USER, // Set default role to USER
    })
  }

  /**
   * Updates an existing user.
   * @param id - The user ID.
   * @param data - The updated user data.
   * @param banner - Optional new banner file.
   * @return A promise that resolves to the updated User instance.
   * @throws Error if user is not found or update fails
   */
  async update(id: number, data: UpdateUserData, banner?: MultipartFile): Promise<User> {
    const user = await this.findUserOrFail(id)

    // Update user fields
    if (data.full_name !== undefined) user.full_name = data.full_name
    if (data.email !== undefined) user.email = data.email
    if (data.password !== undefined) user.password = data.password
    if (data.bannerUrl !== undefined) user.bannerUrl = data.bannerUrl

    // Handle banner update if provided
    if (banner) {
      const uploadConfig = {
        uploadsPath: this.UPLOADS_PATH,
        allowedExtensions: this.ALLOWED_BANNER_EXTENSIONS,
        entityType: 'user',
        entityId: user.id,
      }
      user.bannerUrl = await this.driveService.replaceFile(banner, uploadConfig, user.bannerUrl)
    }

    await user.save()
    return user
  }

  /**
   * Deletes a user by ID and their associated banner image.
   * @param id - The user ID.
   * @return A promise that resolves to true if deleted, false if not found.
   */
  async delete(id: number): Promise<boolean> {
    const user = await User.find(id)
    if (!user) {
      return false
    }

    const uploadConfig = {
      uploadsPath: this.UPLOADS_PATH,
      allowedExtensions: this.ALLOWED_BANNER_EXTENSIONS,
      entityType: 'user',
      entityId: id,
    }
    await this.driveService.deleteFile(user.bannerUrl, uploadConfig, id)
    await user.delete()

    return true
  }

  /**
   * Resets a user's password.
   * @param data - The reset password data containing email and new password.
   * @return A promise that resolves to the updated User instance.
   * @throws Error if user is not found
   */
  async resetPassword(data: ResetPasswordData): Promise<User> {
    const user = await User.findBy('email', data.email)
    if (!user) {
      throw new Error('User not found')
    }

    user.password = data.newPassword
    await user.save()

    return user
  }

  /**
   * Sends a password reset email to the user.
   * @param email - The user's email address.
   * @return A promise that resolves to the User instance if found, null otherwise.
   */
  async sendPasswordReset(email: string): Promise<User | null> {
    const user = await User.findBy('email', email)
    if (!user) {
      return null
    }

    await this.emailsService.sendPasswordReset(user)
    return user
  }

  /**
   * Uploads a banner image for a user.
   * @param userId - The user ID.
   * @param banner - The banner file to be uploaded.
   * @return A promise that resolves to the updated User instance.
   * @throws Error if user is not found or file upload fails
   */
  async uploadBanner(userId: number, banner: MultipartFile): Promise<User> {
    if (!banner) {
      throw new Error('Banner image is required')
    }

    const user = await this.findUserOrFail(userId)
    const uploadConfig = {
      uploadsPath: this.UPLOADS_PATH,
      allowedExtensions: this.ALLOWED_BANNER_EXTENSIONS,
      entityType: 'user',
      entityId: user.id,
    }
    user.bannerUrl = await this.driveService.replaceFile(banner, uploadConfig, user.bannerUrl)
    await user.save()

    return user
  }

  /**
   * Links an OAuth provider account to the user.
   * @param {User} user - The user to link the account to.
   * @param {OAuthProviders} providerName - The OAuth provider name.
   * @param {string} providerId - The unique ID from the OAuth provider.
   * @returns {Promise<OAuthProvider>} - The created OAuth provider record.
   */
  async linkOAuthAccount(
    user: User,
    providerName: OAuthProviders,
    providerId: string
  ): Promise<OAuthProvider> {
    return await OAuthProvider.create({
      userId: user.id,
      providerName,
      providerId,
    })
  }

  /**
   * Handles OAuth login or registration.
   * @param {OAuthProviders} providerName - The OAuth provider name.
   * @param {string} providerId - The unique ID from the OAuth provider.
   * @param {string} email - The user's email address.
   * @param {string} fullName - The user's full name.
   * @returns {Promise<User>} - The authenticated or registered user.
   */
  async handleOAuthLoginOrRegister({
    providerName,
    providerId,
    email,
    fullName,
  }: {
    providerName: OAuthProviders
    providerId: string
    email: string
    fullName: string
  }): Promise<User> {
    // First check if user exists with this OAuth provider ID
    const existingProvider = await OAuthProvider.query()
      .where('providerName', providerName)
      .where('providerId', providerId)
      .preload('user')
      .first()

    if (existingProvider) return existingProvider.user

    // Check if user exists with this email
    let user = await User.query().where('email', email).first()

    if (!user) {
      // Create new user
      user = await User.create({
        full_name: fullName,
        email,
        password: Math.random().toString(36).slice(-12),
        role: UserRoles.USER, // Set default role to USER
        bannerUrl: this.DEFAULT_BANNER_URL_TEMPLATE.replace('{email}', email).replace(
          '{fullName}',
          fullName
        ),
      })
    }

    // Link OAuth provider to user (existing or new)
    await this.linkOAuthAccount(user, providerName, providerId)

    return user
  }

  /**
   * Unlinks an OAuth provider account from a user.
   * @param {User} user - The user to unlink the account from.
   * @param {OAuthProviders} providerName - The OAuth provider name to unlink.
   * @returns {Promise<boolean>} - True if unlinked successfully, false if not found.
   */
  async unlinkOAuthAccount(user: User, providerName: OAuthProviders): Promise<boolean> {
    const oauthProvider = await OAuthProvider.query()
      .where('userId', user.id)
      .where('providerName', providerName)
      .first()

    if (!oauthProvider) {
      return false
    }

    await oauthProvider.delete()
    return true
  }

  /**
   * Gets a user by ID.
   * @param id - The user ID.
   * @return A promise that resolves to the User instance.
   * @throws Error if user is not found
   */
  async getById(id: number): Promise<User> {
    return await this.findUserOrFail(id)
  }

  /**
   * Finds a user by ID.
   * Returns null when not found (used by unit tests)
   */
  async findById(id: number): Promise<User | null> {
    return await User.find(id)
  }

  /**
   * Finds a user by email.
   * Returns null when not found (used by unit tests)
   */
  async findByEmail(email: string): Promise<User | null> {
    return await User.findBy('email', email)
  }

  /**
   * Finds a user by ID or throws an error if not found
   * @private
   */
  private async findUserOrFail(id: number): Promise<User> {
    const user = await User.find(id)
    if (!user) {
      throw new Error('User not found')
    }
    return user
  }
}
