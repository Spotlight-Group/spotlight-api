import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'

test.group('Auth - Register Controller', () => {
  test('should register user with valid data', async ({ client }: { client: ApiClient }) => {
    const response = await client.post('/register').json({
      full_name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'password123',
      bannerUrl: 'https://example.com/banner.jpg',
    })

    response.assertStatus(201)
    response.assertBodyContains({
      user: {
        full_name: 'John Doe',
        email: 'john.doe@example.com',
      },
    })
    response.assertBodyContains(['token'])
  })

  test('should register user without optional bannerUrl', async ({
    client,
  }: {
    client: ApiClient
  }) => {
    const response = await client.post('/register').json({
      full_name: 'Jane Doe',
      email: 'jane.doe@example.com',
      password: 'password123',
    })

    response.assertStatus(201)
    response.assertBodyContains({
      user: {
        full_name: 'Jane Doe',
        email: 'jane.doe@example.com',
      },
    })
    response.assertBodyContains(['token'])
  })

  test('should return 400 if user is already logged in', async ({
    client,
  }: {
    client: ApiClient
  }) => {
    // First register a user
    const registerResponse = await client.post('/register').json({
      full_name: 'Test User',
      email: 'test.user@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    // Try to register again while logged in
    const secondRegisterResponse = await client.post('/register').bearerToken(token).json({
      full_name: 'Another User',
      email: 'another.user@example.com',
      password: 'password123',
    })

    secondRegisterResponse.assertStatus(400)
    secondRegisterResponse.assertBodyContains({
      message: 'You are already logged in',
    })
  })

  test('should return 422 for duplicate email', async ({ client }: { client: ApiClient }) => {
    // First register a user
    await client.post('/register').json({
      full_name: 'First User',
      email: 'duplicate@example.com',
      password: 'password123',
    })

    // Try to register with the same email
    const response = await client.post('/register').json({
      full_name: 'Second User',
      email: 'duplicate@example.com',
      password: 'password456',
    })

    response.assertStatus(422)
  })

  test('should return 422 for invalid email format', async ({ client }: { client: ApiClient }) => {
    const response = await client.post('/register').json({
      full_name: 'Test User',
      email: 'invalid-email',
      password: 'password123',
    })

    response.assertStatus(422)
  })

  test('should return 422 for short password', async ({ client }: { client: ApiClient }) => {
    const response = await client.post('/register').json({
      full_name: 'Test User',
      email: 'test@example.com',
      password: '123', // Too short
    })

    response.assertStatus(422)
  })

  test('should return 422 for short full_name', async ({ client }: { client: ApiClient }) => {
    const response = await client.post('/register').json({
      full_name: 'AB', // Too short (less than 3 characters)
      email: 'test@example.com',
      password: 'password123',
    })

    response.assertStatus(422)
  })

  test('should return 422 for missing required fields', async ({
    client,
  }: {
    client: ApiClient
  }) => {
    const response = await client.post('/register').json({
      email: 'test@example.com',
      // missing full_name and password
    })

    response.assertStatus(422)
  })

  test('should return 422 for invalid bannerUrl format', async ({
    client,
  }: {
    client: ApiClient
  }) => {
    const response = await client.post('/register').json({
      full_name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      bannerUrl: 'invalid-url',
    })

    response.assertStatus(422)
  })

  test('should return 422 for too long full_name', async ({ client }: { client: ApiClient }) => {
    const longName = 'A'.repeat(256) // Exceeds 255 character limit
    const response = await client.post('/register').json({
      full_name: longName,
      email: 'test@example.com',
      password: 'password123',
    })

    response.assertStatus(422)
  })

  test('should return 422 for too long password', async ({ client }: { client: ApiClient }) => {
    const longPassword = 'A'.repeat(256) // Exceeds 255 character limit
    const response = await client.post('/register').json({
      full_name: 'Test User',
      email: 'test@example.com',
      password: longPassword,
    })

    response.assertStatus(422)
  })
})
