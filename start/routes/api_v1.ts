import router from '@adonisjs/core/services/router'

/**
 * API v1 Routes
 * All routes are prefixed with /api/v1
 */
router
  .group(() => {
    // Import and mount all existing routes from app.ts
    // This provides a versioned API structure for future expansion
    router.get('/health', async ({ response }) => {
      response.redirect('/health')
    })

    // Note: Main routes are currently at root level in start/routes/app.ts
    // Future versions (v2, v3) can be added alongside v1
  })
  .prefix('/api/v1')
