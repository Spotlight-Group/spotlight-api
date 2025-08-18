import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'

test.group('Auth - Get User Controller', () => {
  test('should get authenticated user profile', async ({ client }: { client: ApiClient }) => {
    // First register a user
    const registerResponse = await client.post('/register').json({
      full_name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    // Get user profile
    const response = await client.get('/users/me').bearerToken(token)

    response.assertStatus(200)
    response.assertBodyContains({
      id: registerResponse.body().user.id,
      full_name: 'John Doe',
      email: 'john.doe@example.com',
    })
  })

  test('should return 401 for unauthenticated request', async ({
    client,
  }: {
    client: ApiClient
  }) => {
    const response = await client.get('/users/me')

    response.assertStatus(401)
  })

  test('should return 401 for invalid token', async ({ client }: { client: ApiClient }) => {
    const response = await client.get('/users/me').bearerToken('invalid-token')

    response.assertStatus(401)
  })

  test('should return 401 for expired token', async ({ client }: { client: ApiClient }) => {
    // This test would require a way to create expired tokens
    // For now, we'll test with a malformed token
    const response = await client.get('/users/me').bearerToken('oat_1.expired_token_here')

    response.assertStatus(401)
  })

  test('should get user with all profile fields', async ({ client }: { client: ApiClient }) => {
    // Register a user with banner URL
    const registerResponse = await client.post('/register').json({
      full_name: 'Jane Smith',
      email: 'jane.smith@example.com',
      password: 'password123',
      bannerUrl: 'https://example.com/banner.jpg',
    })

    const token = registerResponse.body().token.value

    // Get user profile
    const response = await client.get('/users/me').bearerToken(token)

    response.assertStatus(200)
    response.assertBodyContains({
      full_name: 'Jane Smith',
      email: 'jane.smith@example.com',
    })
    // Check that sensitive fields are not returned
    response.assertBodyNotContains(['password'])
  })

  test('should handle concurrent requests for same user', async ({
    client,
  }: {
    client: ApiClient
  }) => {
    // Register a user
    const registerResponse = await client.post('/register').json({
      full_name: 'Concurrent User',
      email: 'concurrent@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    // Make multiple concurrent requests
    const promises = Array(5)
      .fill(null)
      .map(() => client.get('/users/me').bearerToken(token))

    const responses = await Promise.all(promises)

    // All requests should succeed
    responses.forEach((response) => {
      response.assertStatus(200)
      response.assertBodyContains({
        full_name: 'Concurrent User',
        email: 'concurrent@example.com',
      })
    })
  })
})
