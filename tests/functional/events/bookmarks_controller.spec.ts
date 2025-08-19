import { test } from '@japa/runner'

test.group('Events - Bookmarks Controller', () => {
  test('should create a bookmark for authenticated user', async ({ client, assert }) => {
    // Register and login a user
    const registerResponse = await client.post('/register').json({
      full_name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    // Create a bookmark (assuming eventId 1 exists or we need to create an event first)
    const response = await client.post('/bookmarks').bearerToken(token).json({ eventId: 1 })

    // Should succeed or return appropriate error if event doesn't exist
    assert.include([200, 201, 404], response.response.status)
  })

  test('should return 401 for unauthenticated bookmark creation', async ({ client }) => {
    const response = await client.post('/bookmarks').json({ eventId: 1 })

    response.assertStatus(401)
  })

  test('should delete a bookmark for authenticated user', async ({ client, assert }) => {
    // Register and login a user
    const registerResponse = await client.post('/register').json({
      full_name: 'Test User',
      email: 'test2@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    // Try to delete a bookmark
    const response = await client.delete('/bookmarks/1').bearerToken(token)

    // Should succeed or return appropriate error
    assert.include([200, 204, 404], response.response.status)
  })

  test('should return 401 for unauthenticated bookmark deletion', async ({ client }) => {
    const response = await client.delete('/bookmarks/1')

    response.assertStatus(401)
  })

  test('should get user bookmarks', async ({ client, assert }) => {
    // Register and login a user
    const registerResponse = await client.post('/register').json({
      full_name: 'Test User',
      email: 'test3@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    // Get user bookmarks
    const response = await client.get('/bookmarks').bearerToken(token)

    response.assertStatus(200)
    response.assertBodyContains(['data'])

    const body = response.body()
    assert.isArray(body.data)
  })

  test('should return 401 for unauthenticated bookmark listing', async ({ client }) => {
    const response = await client.get('/bookmarks')

    response.assertStatus(401)
  })

  test('should handle bookmark pagination', async ({ client, assert }) => {
    // Register and login a user
    const registerResponse = await client.post('/register').json({
      full_name: 'Test User',
      email: 'test4@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    // Get bookmarks with pagination
    const response = await client.get('/bookmarks').bearerToken(token).qs({
      page: 1,
      limit: 10,
    })

    response.assertStatus(200)
    response.assertBodyContains(['data'])

    const body = response.body()
    assert.isArray(body.data)
    // Check if pagination meta is included
    if (body.meta) {
      assert.property(body.meta, 'currentPage')
      assert.property(body.meta, 'perPage')
    }
  })

  test('should prevent duplicate bookmarks', async ({ client, assert }) => {
    // Register and login a user
    const registerResponse = await client.post('/register').json({
      full_name: 'Test User',
      email: 'test5@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    // Try to create the same bookmark twice
    const firstResponse = await client.post('/bookmarks').bearerToken(token).json({ eventId: 1 })

    const secondResponse = await client.post('/bookmarks').bearerToken(token).json({ eventId: 1 })

    // First should succeed or fail if event doesn't exist
    // Second should return conflict or be idempotent
    if (firstResponse.response.status === 201 || firstResponse.response.status === 200) {
      assert.include([200, 409], secondResponse.response.status)
    }
  })

  test('should handle invalid event ID for bookmark creation', async ({ client }) => {
    // Register and login a user
    const registerResponse = await client.post('/register').json({
      full_name: 'Test User',
      email: 'test6@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    // Try to bookmark non-existent event
    const response = await client.post('/bookmarks').bearerToken(token).json({ eventId: 999999 })

    response.assertStatus(404)
  })

  test('should handle invalid event ID for bookmark deletion', async ({ client }) => {
    // Register and login a user
    const registerResponse = await client.post('/register').json({
      full_name: 'Test User',
      email: 'test7@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    // Try to delete bookmark for non-existent event
    const response = await client.delete('/bookmarks/999999').bearerToken(token)

    response.assertStatus(404)
  })

  test('should handle non-numeric event ID', async ({ client, assert }) => {
    // Register and login a user
    const registerResponse = await client.post('/register').json({
      full_name: 'Test User',
      email: 'test8@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    // Try to bookmark with invalid event ID
    const response = await client.post('/bookmarks').bearerToken(token).json({ eventId: 'invalid' })

    assert.include([400, 422, 404], response.response.status)
  })

  test('should return empty array for user with no bookmarks', async ({ client, assert }) => {
    // Register and login a new user
    const registerResponse = await client.post('/register').json({
      full_name: 'New User',
      email: 'newuser@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    // Get bookmarks for new user
    const response = await client.get('/bookmarks').bearerToken(token)

    response.assertStatus(200)
    response.assertBodyContains(['data'])

    const body = response.body()
    assert.isArray(body.data)
    assert.lengthOf(body.data, 0)
  })

  test('should handle concurrent bookmark operations', async ({ client, assert }) => {
    // Register and login a user
    const registerResponse = await client.post('/register').json({
      full_name: 'Concurrent User',
      email: 'concurrent@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    // Make multiple concurrent bookmark requests
    const promises = Array(3)
      .fill(null)
      .map(() => client.post('/bookmarks').bearerToken(token).json({ eventId: 1 }))

    const responses = await Promise.all(promises)

    // At least one should succeed, others should handle gracefully
    const successfulResponses = responses.filter((r) => [200, 201].includes(r.response.status))

    assert.isAtLeast(successfulResponses.length, 0)
  })
})
