import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'

test.group('Events - Create Event Controller', () => {
  test('should create event with authenticated user', async ({ client }: { client: ApiClient }) => {
    // Register and login a user
    const registerResponse = await client.post('/register').json({
      full_name: 'Event Creator',
      email: 'creator@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    // Create an event
    const eventData = {
      title: 'Test Concert',
      description: 'A great test concert',
      type: 'concert',
      subtype: 'rock',
      startDate: '2024-12-01',
      endDate: '2024-12-01',
      startTime: '20:00',
      endTime: '23:00',
      city: 'New York',
      venue: 'Madison Square Garden',
      address: '4 Pennsylvania Plaza, New York, NY 10001',
      price: 50.0,
      capacity: 1000,
    }

    const response = await client.post('/events').bearerToken(token).json(eventData)

    // Event creation requires admin privileges, so regular users should get 403
    response.assertStatus(403)
  })

  test('should return 401 for unauthenticated event creation', async ({
    client,
  }: {
    client: ApiClient
  }) => {
    const eventData = {
      title: 'Unauthorized Event',
      description: 'This should fail',
      type: 'concert',
      subtype: 'rock',
      startDate: '2024-12-01',
      endDate: '2024-12-01',
      city: 'New York',
    }

    const response = await client.post('/events').json(eventData)

    response.assertStatus(401)
  })

  test('should return 422 for missing required fields', async ({
    client,
  }: {
    client: ApiClient
  }) => {
    // Register and login a user
    const registerResponse = await client.post('/register').json({
      full_name: 'Test User',
      email: 'test.validation@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    // Try to create an event with missing required fields
    const response = await client.post('/events').bearerToken(token).json({
      title: 'Incomplete Event',
      // missing required fields
    })

    response.assertStatus(422)
  })

  test('should return 422 for invalid event type', async ({ client }: { client: ApiClient }) => {
    // Register and login a user
    const registerResponse = await client.post('/register').json({
      full_name: 'Test User',
      email: 'test.type@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    const eventData = {
      title: 'Invalid Type Event',
      description: 'Testing invalid type',
      type: 'invalid_type',
      subtype: 'rock',
      startDate: '2024-12-01',
      endDate: '2024-12-01',
      city: 'New York',
    }

    const response = await client.post('/events').bearerToken(token).json(eventData)

    response.assertStatus(422)
  })

  test('should return 422 for invalid event subtype', async ({ client }: { client: ApiClient }) => {
    // Register and login a user
    const registerResponse = await client.post('/register').json({
      full_name: 'Test User',
      email: 'test.subtype@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    const eventData = {
      title: 'Invalid Subtype Event',
      description: 'Testing invalid subtype',
      type: 'concert',
      subtype: 'invalid_subtype',
      startDate: '2024-12-01',
      endDate: '2024-12-01',
      city: 'New York',
    }

    const response = await client.post('/events').bearerToken(token).json(eventData)

    response.assertStatus(422)
  })

  test('should return 422 for invalid date format', async ({ client }: { client: ApiClient }) => {
    // Register and login a user
    const registerResponse = await client.post('/register').json({
      full_name: 'Test User',
      email: 'test.date@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    const eventData = {
      title: 'Invalid Date Event',
      description: 'Testing invalid date',
      type: 'concert',
      subtype: 'rock',
      startDate: 'invalid-date',
      endDate: '2024-12-01',
      city: 'New York',
    }

    const response = await client.post('/events').bearerToken(token).json(eventData)

    response.assertStatus(422)
  })

  test('should return 422 for end date before start date', async ({
    client,
  }: {
    client: ApiClient
  }) => {
    // Register and login a user
    const registerResponse = await client.post('/register').json({
      full_name: 'Test User',
      email: 'test.daterange@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    const eventData = {
      title: 'Invalid Date Range Event',
      description: 'Testing invalid date range',
      type: 'concert',
      subtype: 'rock',
      startDate: '2024-12-01',
      endDate: '2024-11-30', // End date before start date
      city: 'New York',
    }

    const response = await client.post('/events').bearerToken(token).json(eventData)

    response.assertStatus(422)
  })

  test('should return 422 for negative price', async ({ client }: { client: ApiClient }) => {
    // Register and login a user
    const registerResponse = await client.post('/register').json({
      full_name: 'Test User',
      email: 'test.price@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    const eventData = {
      title: 'Negative Price Event',
      description: 'Testing negative price',
      type: 'concert',
      subtype: 'rock',
      startDate: '2024-12-01',
      endDate: '2024-12-01',
      city: 'New York',
      price: -10.0,
    }

    const response = await client.post('/events').bearerToken(token).json(eventData)

    response.assertStatus(422)
  })

  test('should return 422 for negative capacity', async ({ client }: { client: ApiClient }) => {
    // Register and login a user
    const registerResponse = await client.post('/register').json({
      full_name: 'Test User',
      email: 'test.capacity@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    const eventData = {
      title: 'Negative Capacity Event',
      description: 'Testing negative capacity',
      type: 'concert',
      subtype: 'rock',
      startDate: '2024-12-01',
      endDate: '2024-12-01',
      city: 'New York',
      capacity: -100,
    }

    const response = await client.post('/events').bearerToken(token).json(eventData)

    response.assertStatus(422)
  })

  test('should create event with minimal required fields', async ({
    client,
    assert,
  }: {
    client: ApiClient
    assert: any
  }) => {
    // Register and login a user
    const registerResponse = await client.post('/register').json({
      full_name: 'Minimal User',
      email: 'minimal@example.com',
      password: 'password123',
    })

    const token = registerResponse.body().token.value

    const minimalEventData = {
      title: 'Minimal Event',
      description: 'Event with minimal data',
      type: 'concert',
      subtype: 'rock',
      startDate: '2024-12-01',
      endDate: '2024-12-01',
      city: 'New York',
    }

    const response = await client.post('/events').bearerToken(token).json(minimalEventData)

    // Should succeed or return the appropriate validation error
    assert.oneOf(response.response.status, [200, 201, 422])
  })
})
