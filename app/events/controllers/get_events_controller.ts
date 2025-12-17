import { HttpContext } from '@adonisjs/core/http'
import { getEventsValidator } from '#events/validators/events'
import { EventsService } from '#events/services/events_service'
import { inject } from '@adonisjs/core'

@inject()
export default class GetEventsController {
  constructor(protected eventsService: EventsService) {}

  /**
   * @index
   * @summary Get all events
   * @description Retrieve a paginated list of events with optional filtering
   * @tag Events
   * @paramQuery page - Page number for pagination - @type(number) @example(1)
   * @paramQuery limit - Number of events per page - @type(number) @example(10)
   * @paramQuery type - Filter by event type - @enum(concert, festival, exhibition, conference)
   * @paramQuery subtype - Filter by event subtype - @enum(rock, hiphop, jazz, techno, classical)
   * @paramQuery city - Filter by city name - @type(string) @example(New York)
   * @paramQuery startDate - Filter events starting from this date (YYYY-MM-DD) - @type(string) @example(2024-01-01)
   * @paramQuery endDate - Filter events ending before this date (YYYY-MM-DD) - @type(string) @example(2024-12-31)
   * @responseBody 200 - <Event[]>.paginated() - Events retrieved successfully
   * @responseBody 400 - {"message": "Validation failed", "errors": []} - Validation errors
   * @responseBody 401 - Unauthorized - Invalid or missing token
   * @responseBody 500 - {"message": "An error occurred while retrieving events", "error": "string"} - Internal server error
   */
  async handle({ request, response, auth }: HttpContext): Promise<void> {
    try {
      const queryParams = await request.validateUsing(getEventsValidator)

      // Get current user ID if authenticated and add it to query params
      const userId = auth.user?.id
      const eventsOptions = { ...queryParams, userId }

      const events = await this.eventsService.getAll(eventsOptions)

      return response.ok({
        message: 'Events retrieved successfully',
        data: events.all(),
        meta: {
          total: events.total,
          perPage: events.perPage,
          currentPage: events.currentPage,
          lastPage: events.lastPage,
          firstPage: events.firstPage,
          hasPages: events.hasPages,
          hasMorePages: events.hasMorePages,
          isEmpty: events.isEmpty,
        },
      })
    } catch (error) {
      // Handle validation errors
      if (error.messages) {
        return response.badRequest({
          message: 'Validation failed',
          errors: error.messages,
        })
      }

      // Handle other errors
      return response.internalServerError({
        message: 'An error occurred while retrieving events',
        error: error.message,
      })
    }
  }
}
