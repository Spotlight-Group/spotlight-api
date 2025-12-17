import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import AutoSwagger from 'adonis-autoswagger'
import swagger from '#config/swagger'

// Swagger Documentation Routes
// returns swagger in YAML
router.get('/swagger', async () => {
  return AutoSwagger.default.docs(router.toJSON(), swagger)
})

// Renders Swagger-UI and passes YAML-output of /swagger
router.get('/docs', async () => {
  return AutoSwagger.default.ui('/swagger', swagger)
})

// Health check controller import (needs to be before route usage)
const HealthController = () => import('#core/controllers/health_controller')

// Health check endpoint (no auth required)
router.get('/health', [HealthController])

// GUEST region Controller's Imports
const LoginController = () => import('#auth/controllers/login_controller')
const RegisterController = () => import('#auth/controllers/register_controller')
const ResetPasswordController = () => import('#auth/controllers/reset_password_controller')
const ForgotPasswordController = () => import('#auth/controllers/forgot_password_controller')
const OauthController = () => import('#auth/controllers/oauth_controller')
// endregion

router.group(() => {
  router.post('login', [LoginController]).as('users.login')
  router.post('register', [RegisterController]).as('users.register')
  router
    .get('reset-password/:token', [ResetPasswordController, 'show'])
    .as('users.reset-password-form')
  router.post('reset-password', [ResetPasswordController]).as('users.reset-password')
  router.post('forgot-password', [ForgotPasswordController]).as('users.forgot-password')
  router.get('oauth/:provider', [OauthController, 'redirect']).as('oauth.redirect')
  router.get('oauth/:provider/callback', [OauthController, 'callback']).as('oauth.callback')
})

// CLIENT region Controller's Imports
const CreateEventController = () => import('#events/controllers/create_event_controller')
const GetEventsController = () => import('#events/controllers/get_events_controller')
const GetEventController = () => import('#events/controllers/get_event_controller')
const UpdateEventController = () => import('#events/controllers/update_event_controller')
const DeleteEventController = () => import('#events/controllers/delete_event_controller')
const ScrapeEventsController = () => import('#events/controllers/scrape_events_controller')
const GetUserController = () => import('#auth/controllers/get_user_controller')
const UpdateUserController = () => import('#auth/controllers/update_user_controller')
const DeleteUserController = () => import('#auth/controllers/delete_user_controller')
const UploadUserBannerController = () => import('#auth/controllers/upload_user_banner_controller')
const CreateMessageController = () => import('#messages/controllers/create_message_controller')
const GetMessagesController = () => import('#messages/controllers/get_messages_controller')
const GetMessageController = () => import('#messages/controllers/get_message_controller')
const UpdateMessageController = () => import('#messages/controllers/update_message_controller')
const DeleteMessageController = () => import('#messages/controllers/delete_message_controller')
const CreateArtistController = () => import('#artists/controllers/create_artist_controller')
const GetArtistsController = () => import('#artists/controllers/get_artists_controller')
const GetArtistController = () => import('#artists/controllers/get_artist_controller')
const UpdateArtistController = () => import('#artists/controllers/update_artist_controller')
const DeleteArtistController = () => import('#artists/controllers/delete_artist_controller')
const AddEventArtistsController = () => import('#events/controllers/add_event_artists_controller')
const RemoveEventArtistsController = () =>
  import('#events/controllers/remove_event_artists_controller')
const GetEventArtistsController = () => import('#events/controllers/get_event_artists_controller')
const BookmarksController = () => import('#events/controllers/bookmarks_controller')
// endregion

// Scraper route for testing - Admin only
router.get('/scrap/events/toulouse', [ScrapeEventsController]).as('events.scrape')
// .middleware([middleware.auth(), middleware.admin()])

// Pages CLIENT
router
  .group(() => {
    // Events GET routes - require authentication
    router.get('/events', [GetEventsController]).as('events.index')
    router.get('/events/:id', [GetEventController]).as('events.show')

    // Messages CRUD routes - GET and POST accessible to all authenticated users
    router.post('/messages', [CreateMessageController]).as('messages.store')
    router.get('/events/:eventId/messages', [GetMessagesController]).as('messages.index')
    router.get('/messages/:id', [GetMessageController]).as('messages.show')

    // Artists CRUD routes - GET routes accessible to all authenticated users
    router.get('/artists', [GetArtistsController]).as('artists.index')
    router.get('/artists/:id', [GetArtistController]).as('artists.show')

    // Event-Artist relationship management routes - GET accessible to all authenticated users
    router.get('/events/:id/artists', [GetEventArtistsController]).as('events.artists.index')

    // Bookmarks routes - accessible to all authenticated users
    router.post('/bookmarks', [BookmarksController, 'store']).as('bookmarks.store')
    router.get('/bookmarks', [BookmarksController, 'index']).as('bookmarks.index')
    router.get('/bookmarks/stats', [BookmarksController, 'stats']).as('bookmarks.stats')
    router.get('/bookmarks/check/:eventId', [BookmarksController, 'check']).as('bookmarks.check')
    router.delete('/bookmarks/:eventId', [BookmarksController, 'destroy']).as('bookmarks.destroy')

    // Users self-management routes - accessible to all authenticated users
    router.get('/users/me', [GetUserController]).as('users.me')
    router.put('/users/me', [UpdateUserController]).as('users.update-me')
    router.delete('/users/me', [DeleteUserController]).as('users.delete-me')
    router.post('/users/:id/banner', [UploadUserBannerController]).as('users.upload-banner')

    // OAuth management routes - accessible to all authenticated users
    router.delete('/oauth/:provider/unlink', [OauthController, 'unlink']).as('oauth.unlink')
  })
  .middleware([middleware.auth()])

// Admin-only routes
router
  .group(() => {
    // Events CRUD routes - Admin only
    router.post('/events', [CreateEventController]).as('events.store')
    router.put('/events/:id', [UpdateEventController]).as('events.update')
    router.patch('/events/:id', [UpdateEventController]).as('events.patch')
    router.delete('/events/:id', [DeleteEventController]).as('events.destroy')

    // Messages UPDATE/DELETE routes - Admin only
    router.put('/messages/:id', [UpdateMessageController]).as('messages.update')
    router.patch('/messages/:id', [UpdateMessageController]).as('messages.patch')
    router.delete('/messages/:id', [DeleteMessageController]).as('messages.destroy')

    // Artists CRUD routes - Admin only
    router.post('/artists', [CreateArtistController]).as('artists.store')
    router.put('/artists/:id', [UpdateArtistController]).as('artists.update')
    router.patch('/artists/:id', [UpdateArtistController]).as('artists.patch')
    router.delete('/artists/:id', [DeleteArtistController]).as('artists.destroy')

    // Event-Artist relationship management routes - Admin only
    router.post('/events/:id/artists', [AddEventArtistsController]).as('events.artists.add')
    router.delete('/events/:id/artists', [RemoveEventArtistsController]).as('events.artists.remove')

    // Users management routes for other users - Admin only
    router.put('/users/:id', [UpdateUserController]).as('users.update')
    router.delete('/users/:id', [DeleteUserController]).as('users.delete')
  })
  .middleware([middleware.auth(), middleware.admin()])
