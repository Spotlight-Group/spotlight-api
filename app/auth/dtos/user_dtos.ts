/**
 * Data Transfer Objects for Authentication and Users
 */

export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  full_name: string
  email: string
  password: string
}

export interface UpdateUserDto {
  full_name?: string
  email?: string
}

export interface ResetPasswordDto {
  email: string
  newPassword: string
}

export interface UserResponseDto {
  id: number
  full_name: string
  email: string
  role: string
  bannerUrl: string | null
  createdAt: string
  updatedAt: string | null
}

export interface AuthResponseDto {
  user: UserResponseDto
  token: {
    type: string
    value: string
    expiresAt?: string
  }
}

export interface OAuthDto {
  providerName: string
  providerId: string
  email: string
  fullName: string
}
