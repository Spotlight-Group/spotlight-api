import { test } from '@japa/runner'
import { UsersService } from '#auth/services/users_service'
import User from '#auth/models/user'

test.group('Auth - Users Service', () => {
  test('should register a new user with valid data', async ({ assert }) => {
    const usersService = new UsersService()

    const userData = {
      full_name: 'John Doe',
      email: 'john.doe.service@example.com',
      password: 'password123',
      bannerUrl: 'https://example.com/banner.jpg',
    }

    const user = await usersService.register(userData)

    assert.isObject(user)
    assert.equal(user.full_name, 'John Doe')
    assert.equal(user.email, 'john.doe.service@example.com')
    assert.isUndefined(user.password) // Password should not be returned
    assert.exists(user.id)
  })

  test('should register a user without optional bannerUrl', async ({ assert }) => {
    const usersService = new UsersService()

    const userData = {
      full_name: 'Jane Doe',
      email: 'jane.doe.service@example.com',
      password: 'password123',
    }

    const user = await usersService.register(userData)

    assert.isObject(user)
    assert.equal(user.full_name, 'Jane Doe')
    assert.equal(user.email, 'jane.doe.service@example.com')
    assert.exists(user.id)
  })

  test('should throw error for duplicate email registration', async ({ assert }) => {
    const usersService = new UsersService()

    const userData = {
      full_name: 'Duplicate User',
      email: 'duplicate.service@example.com',
      password: 'password123',
    }

    // Register first user
    await usersService.register(userData)

    // Try to register with same email
    try {
      await usersService.register({
        ...userData,
        full_name: 'Another User',
      })
      assert.fail('Should have thrown an error for duplicate email')
    } catch (error) {
      assert.exists(error)
    }
  })

  test('should authenticate user with valid credentials', async ({ assert }) => {
    const usersService = new UsersService()

    const userData = {
      full_name: 'Auth User',
      email: 'auth.user.service@example.com',
      password: 'password123',
    }

    // Register user first
    await usersService.register(userData)

    // Attempt login
    const user = await usersService.attempt('auth.user.service@example.com', 'password123')

    assert.isObject(user)
    assert.equal(user.email, 'auth.user.service@example.com')
    assert.equal(user.full_name, 'Auth User')
  })

  test('should throw error for invalid email during authentication', async ({ assert }) => {
    const usersService = new UsersService()

    try {
      await usersService.attempt('nonexistent@example.com', 'password123')
      assert.fail('Should have thrown an error for invalid email')
    } catch (error) {
      assert.exists(error)
      assert.include(error.message.toLowerCase(), 'invalid')
    }
  })

  test('should throw error for invalid password during authentication', async ({ assert }) => {
    const usersService = new UsersService()

    const userData = {
      full_name: 'Password Test User',
      email: 'password.test.service@example.com',
      password: 'password123',
    }

    // Register user first
    await usersService.register(userData)

    try {
      await usersService.attempt('password.test.service@example.com', 'wrongpassword')
      assert.fail('Should have thrown an error for invalid password')
    } catch (error) {
      assert.exists(error)
      assert.include(error.message.toLowerCase(), 'invalid')
    }
  })

  test('should find user by id', async ({ assert }) => {
    const usersService = new UsersService()

    const userData = {
      full_name: 'Find User',
      email: 'find.user.service@example.com',
      password: 'password123',
    }

    const registeredUser = await usersService.register(userData)
    const foundUser = await usersService.findById(registeredUser.id)

    if (!foundUser) {
      assert.fail('User should exist')
      return
    }

    assert.isObject(foundUser)
    assert.equal(foundUser.id, registeredUser.id)
    assert.equal(foundUser.email, 'find.user.service@example.com')
  })

  test('should return null for non-existent user id', async ({ assert }) => {
    const usersService = new UsersService()

    const foundUser = await usersService.findById(999999)

    assert.isNull(foundUser)
  })

  test('should find user by email', async ({ assert }) => {
    const usersService = new UsersService()

    const userData = {
      full_name: 'Email Find User',
      email: 'email.find.service@example.com',
      password: 'password123',
    }

    await usersService.register(userData)
    const foundUser = await usersService.findByEmail('email.find.service@example.com')

    if (!foundUser) {
      assert.fail('User should exist')
      return
    }

    assert.isObject(foundUser)
    assert.equal(foundUser.email, 'email.find.service@example.com')
    assert.equal(foundUser.full_name, 'Email Find User')
  })

  test('should return null for non-existent email', async ({ assert }) => {
    const usersService = new UsersService()

    const foundUser = await usersService.findByEmail('nonexistent.service@example.com')

    assert.isNull(foundUser)
  })

  test('should update user profile', async ({ assert }) => {
    const usersService = new UsersService()

    const userData = {
      full_name: 'Update User',
      email: 'update.user.service@example.com',
      password: 'password123',
    }

    const user = await usersService.register(userData)

    const updateData = {
      full_name: 'Updated Name',
      bannerUrl: 'https://example.com/new-banner.jpg',
    }

    const updatedUser = await usersService.update(user.id, updateData)

    assert.equal(updatedUser.full_name, 'Updated Name')
    assert.equal(updatedUser.email, 'update.user.service@example.com') // Email should remain unchanged
  })

  test('should delete user', async ({ assert }) => {
    const usersService = new UsersService()

    const userData = {
      full_name: 'Delete User',
      email: 'delete.user.service@example.com',
      password: 'password123',
    }

    const user = await usersService.register(userData)

    await usersService.delete(user.id)

    // Try to find the deleted user
    const deletedUser = await usersService.findById(user.id)
    assert.isNull(deletedUser)
  })

  test('should hash password during registration', async ({ assert }) => {
    const usersService = new UsersService()

    const userData = {
      full_name: 'Hash Test User',
      email: 'hash.test.service@example.com',
      password: 'password123',
    }

    await usersService.register(userData)

    // Find user directly from database to check password hash
    const user = await User.findBy('email', 'hash.test.service@example.com')

    if (!user) {
      assert.fail('User should exist in the database')
      return
    }

    assert.exists(user)
    assert.notEqual(user.password, 'password123') // Password should be hashed
    assert.isTrue(user.password.length > 20) // Hashed password should be longer
  })

  test('should handle concurrent user registrations', async ({ assert }) => {
    const usersService = new UsersService()

    const userPromises = Array(3)
      .fill(null)
      .map((_, index) =>
        usersService.register({
          full_name: `Concurrent User ${index}`,
          email: `concurrent${index}.service@example.com`,
          password: 'password123',
        })
      )

    const users = await Promise.all(userPromises)

    assert.equal(users.length, 3)
    users.forEach((user, index) => {
      assert.exists(user.id)
      assert.equal(user.full_name, `Concurrent User ${index}`)
      assert.equal(user.email, `concurrent${index}.service@example.com`)
    })
  })
})
