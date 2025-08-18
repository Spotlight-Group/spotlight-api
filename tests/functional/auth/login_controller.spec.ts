import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'

test.group('Auth - Login Controller', () => {
  test('should login user with valid credentials', async ({ client }: { client: ApiClient }) => {
    // First register a user to test login
    const registerResponse = await client.post('/register').json({
      full_name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    })

    registerResponse.assertStatus(201)

    // Now test login
    const loginResponse = await client.post('/login').json({
      email: 'test@example.com',
      password: 'password123',
    })

    loginResponse.assertStatus(200)
    loginResponse.assertBodyContains({
      user: {
        full_name: 'Test User',
        email: 'test@example.com',
      },
    })
    loginResponse.assertBodyContains(['token'])
  })

  test('should return 401 for invalid credentials', async ({ client }: { client: ApiClient }) => {
    const response = await client.post('/login').json({
      email: 'nonexistent@example.com',
      password: 'wrongpassword',
    })

    response.assertStatus(401)
    response.assertBodyContains({
      message: 'Invalid credentials',
    })
  })

  test('should return 400 if user is already logged in', async ({
    client,
  }: {
    client: ApiClient
  }) => {
    // First register and login a user
    await client.post('/register').json({
      full_name: 'Test User 2',
      email: 'test2@example.com',
      password: 'password123',
    })

    const loginResponse = await client.post('/login').json({
      email: 'test2@example.com',
      password: 'password123',
    })

    const token = loginResponse.body().token.value

    // Try to login again with the same user
    const secondLoginResponse = await client.post('/login').bearerToken(token).json({
      email: 'test2@example.com',
      password: 'password123',
    })

    secondLoginResponse.assertStatus(400)
    secondLoginResponse.assertBodyContains({
      message: 'You are already logged in',
    })
  })

  test('should return 422 for invalid email format', async ({ client }: { client: ApiClient }) => {
    const response = await client.post('/login').json({
      email: 'invalid-email',
      password: 'password123',
    })

    response.assertStatus(422)
  })

  test('should return 422 for missing required fields', async ({
    client,
  }: {
    client: ApiClient
  }) => {
    const response = await client.post('/login').json({
      email: 'test@example.com',
      // missing password
    })

    response.assertStatus(422)
  })
})
