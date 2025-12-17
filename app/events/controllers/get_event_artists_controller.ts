import { HttpContext } from '@adonisjs/core/http'
import { eventIdValidator } from '#events/validators/events'
import { EventsService } from '#events/services/events_service'
import { inject } from '@adonisjs/core'

@inject()
export default class GetEventArtistsController {
  constructor(protected eventsService: EventsService) {}

  /**
   * @index
   * @summary Get artists for an event
   * @description Retrieve all artists associated with a specific event
   * @tag Events
   * @paramPath id - The ID of the event - @type(number) @required
   * @responseBody 200 - {"message": "Event artists retrieved successfully", "data": [<Artist>]} - Artists retrieved successfully
   * @responseBody 400 - {"message": "Invalid event ID", "error": "INVALID_EVENT_ID"} - Invalid event ID provided
   * @responseBody 404 - {"message": "Event not found", "error": "EVENT_NOT_FOUND"} - Event not found
   * @responseBody 500 - {"message": "An error occurred while retrieving event artists", "error": "string"} - Internal server error
   */
  async handle({ request, response, params }: HttpContext): Promise<void> {
    try {
      const { id: eventId } = await request.validateUsing(eventIdValidator, {
        data: params,
      })

      // Get current event
      const event = await this.eventsService.getById(eventId)
      if (!event) {
        return response.notFound({
          message: 'Event not found',
          error: 'EVENT_NOT_FOUND',
        })
      }

      // Load artists with their details
      await event.load('artists', (query) => {
        query.preload('artist')
      })

      // Extract artist details from the pivot relationships
      const artists = event.artists.map((eventArtist) => eventArtist.artist)

      return response.ok({
        message: 'Event artists retrieved successfully',
        data: artists,
        count: artists.length,
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
        message: 'An error occurred while retrieving event artists',
        error: error.message,
      })
    }
  }
}
