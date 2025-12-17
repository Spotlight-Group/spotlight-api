import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { BookmarksService } from '#events/services/bookmarks_service'
import {
  bookmarkEventValidator,
  removeBookmarkValidator,
  getUserBookmarksValidator,
  checkBookmarkValidator,
} from '#events/validators/bookmarks'

@inject()
export default class BookmarksController {
  constructor(private bookmarksService: BookmarksService) {}

  /**
   * Add an event to user's bookmarks
   * POST /bookmarks
   */
  async store({ request, response, auth }: HttpContext): Promise<void> {
    try {
      const user = auth.getUserOrFail()
      const { eventId } = await request.validateUsing(bookmarkEventValidator)

      const bookmark = await this.bookmarksService.addBookmark(user.id, eventId)

      return response.status(201).json({
        message: 'Event bookmarked successfully',
        data: bookmark,
      })
    } catch (error) {
      if (error.message === 'Event not found') {
        return response.status(404).json({
          message: 'Event not found',
        })
      }

      return response.status(500).json({
        message: 'Failed to bookmark event',
        error: error.message,
      })
    }
  }

  /**
   * Remove an event from user's bookmarks
   * DELETE /bookmarks/:eventId
   */
  async destroy({ request, params, response, auth }: HttpContext): Promise<void> {
    try {
      const user = auth.getUserOrFail()
      const { eventId } = await request.validateUsing(removeBookmarkValidator, {
        data: params,
      })

      const removed = await this.bookmarksService.removeBookmark(user.id, eventId)

      if (!removed) {
        return response.status(404).json({
          message: 'Bookmark not found',
        })
      }

      return response.status(200).json({
        message: 'Bookmark removed successfully',
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Failed to remove bookmark',
        error: error.message,
      })
    }
  }

  /**
   * Get all bookmarked events for the authenticated user
   * GET /bookmarks
   */
  async index({ request, response, auth }: HttpContext): Promise<void> {
    try {
      const user = auth.getUserOrFail()
      const { page = 1, limit = 20 } = await request.validateUsing(getUserBookmarksValidator)

      const bookmarks = await this.bookmarksService.getUserBookmarks(user.id, page, limit)

      return response.status(200).json({
        message: 'Bookmarks retrieved successfully',
        data: bookmarks,
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Failed to retrieve bookmarks',
        error: error.message,
      })
    }
  }

  /**
   * Check if an event is bookmarked by the user
   * GET /bookmarks/check/:eventId
   */
  async check({ request, params, response, auth }: HttpContext): Promise<void> {
    try {
      const user = auth.getUserOrFail()
      const { eventId } = await request.validateUsing(checkBookmarkValidator, {
        data: params,
      })

      const isBookmarked = await this.bookmarksService.isBookmarked(user.id, eventId)

      return response.status(200).json({
        message: 'Bookmark status retrieved successfully',
        data: {
          eventId,
          isBookmarked,
        },
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Failed to check bookmark status',
        error: error.message,
      })
    }
  }

  /**
   * Get bookmark statistics for the authenticated user
   * GET /bookmarks/stats
   */
  async stats({ response, auth }: HttpContext): Promise<void> {
    try {
      const user = auth.getUserOrFail()

      const stats = await this.bookmarksService.getBookmarkStats(user.id)

      return response.status(200).json({
        message: 'Bookmark statistics retrieved successfully',
        data: stats,
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Failed to retrieve bookmark statistics',
        error: error.message,
      })
    }
  }
}
