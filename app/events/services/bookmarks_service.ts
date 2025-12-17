import EventUser from '#events/models/event_user'
import Event from '#events/models/event'
import User from '#auth/models/user'
import NotFoundException from '#exceptions/not_found_exception'

export interface BookmarkEventData {
  userId: number
  eventId: number
}

export class BookmarksService {
  /**
   * Adds an event to user's bookmarks (favorites)
   * @param userId - The user ID
   * @param eventId - The event ID to bookmark
   * @returns Promise<EventUser> - The created or updated EventUser record
   * @throws Error if event doesn't exist
   */
  async addBookmark(userId: number, eventId: number): Promise<EventUser> {
    // Check if event exists
    const event = await Event.find(eventId)
    if (!event) {
      throw new NotFoundException('Event not found')
    }

    // Check if user exists
    const user = await User.find(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    // Check if EventUser record already exists
    let eventUser = await EventUser.query()
      .where('userId', userId)
      .where('eventId', eventId)
      .first()

    if (eventUser) {
      // Update existing record to set favorite to true
      eventUser.isFavorite = true
      await eventUser.save()
      return eventUser
    } else {
      // Create new EventUser record with favorite set to true
      return await EventUser.create({
        userId,
        eventId,
        isFavorite: true,
        hasJoined: false,
      })
    }
  }

  /**
   * Removes an event from user's bookmarks
   * @param userId - The user ID
   * @param eventId - The event ID to remove from bookmarks
   * @returns Promise<boolean> - True if removed, false if not found
   */
  async removeBookmark(userId: number, eventId: number): Promise<boolean> {
    const eventUser = await EventUser.query()
      .where('userId', userId)
      .where('eventId', eventId)
      .where('isFavorite', true)
      .first()

    if (!eventUser) {
      return false
    }

    // If user has joined the event, just set favorite to false
    // Otherwise, delete the record entirely
    if (eventUser.hasJoined) {
      eventUser.isFavorite = false
      await eventUser.save()
    } else {
      await eventUser.delete()
    }

    return true
  }

  /**
   * Gets all bookmarked events for a user with pagination
   * @param userId - The user ID
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 20)
   * @returns Promise with paginated bookmarked events
   */
  async getUserBookmarks(userId: number, page: number = 1, limit: number = 20) {
    return await Event.query()
      .join('event_users', 'events.id', 'event_users.event_id')
      .where('event_users.user_id', userId)
      .where('event_users.is_favorite', true)
      .orderBy('event_users.created_at', 'desc')
      .paginate(page, limit)
  }

  /**
   * Checks if a user has bookmarked a specific event
   * @param userId - The user ID
   * @param eventId - The event ID
   * @returns Promise<boolean> - True if bookmarked, false otherwise
   */
  async isBookmarked(userId: number, eventId: number): Promise<boolean> {
    const eventUser = await EventUser.query()
      .where('userId', userId)
      .where('eventId', eventId)
      .where('isFavorite', true)
      .first()

    return !!eventUser
  }

  /**
   * Gets bookmark statistics for a user
   * @param userId - The user ID
   * @returns Promise with bookmark count
   */
  async getBookmarkStats(userId: number): Promise<{ totalBookmarks: number }> {
    const totalBookmarks = await EventUser.query()
      .where('userId', userId)
      .where('isFavorite', true)
      .count('* as total')

    return {
      totalBookmarks: Number(totalBookmarks[0].$extras.total),
    }
  }
}
