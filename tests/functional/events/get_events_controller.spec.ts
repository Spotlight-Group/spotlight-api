import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'

const uniqueEmail = (prefix: string = 'user') =>
  `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`

test.group('Events - Get Events Controller', () => {
  test('should get events without authentication', async ({ client, assert }) => {
    const response = await client.get('/events')

    response.assertStatus(200)
    response.assertBodyContains({
      message: 'Events retrieved successfully',
    })

    // Check pagination meta
    const body = response.body()
    assert.property(body.meta, 'total')
    assert.property(body.meta, 'perPage')
    assert.property(body.meta, 'currentPage')
    assert.property(body.meta, 'lastPage')
  })

  test('should get events with authentication', async ({ client }) => {
    // Register and login a user
    const registerResponse = await client.post('/register').json({
      full_name: 'Test User',
      email: uniqueEmail('test'),
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    const response = await client.get('/events').bearerToken(token)

    response.assertStatus(200)
    response.assertBodyContains({
      message: 'Events retrieved successfully',
    })
  })

  test('should get events with pagination parameters', async ({ client, assert }) => {
    const response = await client.get('/events').qs({
      page: 1,
      limit: 5,
    })

    response.assertStatus(200)
    response.assertBodyContains({
      message: 'Events retrieved successfully',
    })

    const body = response.body()
    assert.equal(body.meta.perPage, 5)
    assert.equal(body.meta.currentPage, 1)
  })

  test('should filter events by type', async ({ client }) => {
    const response = await client.get('/events').qs({
      type: 'concert',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      message: 'Events retrieved successfully',
    })
  })

  test('should filter events by subtype', async ({ client }) => {
    const response = await client.get('/events').qs({
      subtype: 'rock',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      message: 'Events retrieved successfully',
    })
  })

  test('should filter events by city', async ({ client }: { client: ApiClient }) => {
    const response = await client.get('/events').qs({
      city: 'New York',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      message: 'Events retrieved successfully',
    })
  })

  test('should filter events by date range', async ({ client }: { client: ApiClient }) => {
    const response = await client.get('/events').qs({
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      message: 'Events retrieved successfully',
    })
  })

  test('should filter events with multiple parameters', async ({ client, assert }) => {
    const response = await client.get('/events').qs({
      type: 'concert',
      subtype: 'rock',
      city: 'New York',
      page: 1,
      limit: 10,
    })

    response.assertStatus(200)
    response.assertBodyContains({
      message: 'Events retrieved successfully',
    })

    const body = response.body()
    assert.equal(body.meta.perPage, 10)
    assert.equal(body.meta.currentPage, 1)
  })

  test('should return 400 for invalid pagination parameters', async ({
    client,
  }: {
    client: ApiClient
  }) => {
    const response = await client.get('/events').qs({
      page: -1,
      limit: 0,
    })

    response.assertStatus(400)
    response.assertBodyContains({
      message: 'Validation failed',
    })
  })

  test('should return 400 for invalid type parameter', async ({
    client,
  }: {
    client: ApiClient
  }) => {
    const response = await client.get('/events').qs({
      type: 'invalid_type',
    })

    response.assertStatus(400)
    response.assertBodyContains({
      message: 'Validation failed',
    })
  })

  test('should return 400 for invalid subtype parameter', async ({
    client,
  }: {
    client: ApiClient
  }) => {
    const response = await client.get('/events').qs({
      subtype: 'invalid_subtype',
    })

    response.assertStatus(400)
    response.assertBodyContains({
      message: 'Validation failed',
    })
  })

  test('should return 400 for invalid date format', async ({ client }) => {
    const response = await client.get('/events').qs({
      startDate: 'invalid-date',
    })

    response.assertStatus(400)
    response.assertBodyContains({
      message: 'Validation failed',
    })
  })

  test('should handle large limit parameter gracefully', async ({ client, assert }) => {
    const response = await client.get('/events').qs({
      limit: 1000,
    })

    // Should either succeed with capped limit or return validation error
    const status = response.response.status
    ;[200, 400].includes(status) || assert.fail(`Unexpected status: ${status}`)
  })

  test('should handle concurrent requests', async ({ client }: { client: ApiClient }) => {
    const promises = Array(5)
      .fill(null)
      .map(() => client.get('/events').qs({ page: 1, limit: 10 }))

    const responses = await Promise.all(promises)

    responses.forEach((response) => {
      response.assertStatus(200)
      response.assertBodyContains({
        message: 'Events retrieved successfully',
      })
    })
  })

  test('should return consistent pagination structure when no events found', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/events').qs({
      city: 'NonExistentCity12345',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      message: 'Events retrieved successfully',
    })

    const body = response.body()
    assert.property(body.meta, 'total')
    assert.property(body.meta, 'isEmpty')
    assert.instanceOf(body.data, Array)
  })
})
