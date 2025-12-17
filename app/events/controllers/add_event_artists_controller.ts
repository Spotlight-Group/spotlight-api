import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { EventsService } from '#events/services/events_service'
import { addEventArtistsValidator, eventIdValidator } from '#events/validators/events'

@inject()
export default class AddEventArtistsController {
  constructor(protected eventsService: EventsService) {}

  /**
   * @store
   * @summary Add artists to an event
   * @description Add one or more artists to an existing event
   * @tag Events
   * @paramPath id - The ID of the event - @type(number) @required
   * @requestBody {"artistIds": [1, 2, 3]}
   * @responseBody 200 - {"message": "Artists added to event successfully", "data": <Event>} - Artists added successfully
   * @responseBody 400 - {"message": "Invalid event ID", "error": "INVALID_EVENT_ID"} - Invalid event ID provided
   * @responseBody 400 - {"message": "Validation failed", "errors": []} - Validation errors
   * @responseBody 404 - {"message": "Event not found", "error": "EVENT_NOT_FOUND"} - Event not found
   * @responseBody 500 - {"message": "An error occurred while adding artists to event", "error": "string"} - Internal server error
   */
  async handle({ request, response, params }: HttpContext): Promise<void> {
    try {
      const { id: eventId } = await request.validateUsing(eventIdValidator, {
        data: params,
      })

      // Validate request body
      const { artistIds } = await request.validateUsing(addEventArtistsValidator)

      // Get current event
      const event = await this.eventsService.getById(eventId)
      if (!event) {
        return response.notFound({
          message: 'Event not found',
          error: 'EVENT_NOT_FOUND',
        })
      }

      // Load current artists to avoid duplicates
      await event.load('artists')
      const currentArtistIds = event.artists.map((ea) => ea.artistId)

      // Filter out artists that are already associated with the event
      const newArtistIds = artistIds.filter((id) => !currentArtistIds.includes(id))

      if (newArtistIds.length === 0) {
        return response.badRequest({
          message: 'All specified artists are already associated with this event',
          error: 'ARTISTS_ALREADY_ASSOCIATED',
        })
      }

      // Add new artists to existing ones
      const allArtistIds = [...currentArtistIds, ...newArtistIds]

      // Update event with new artist associations
      const updatedEvent = await this.eventsService.update(eventId, { artistIds: allArtistIds })

      return response.ok({
        message: 'Artists added to event successfully',
        data: updatedEvent,
      })
    } catch (error) {
      // Handle validation errors
      if (error.messages) {
        return response.badRequest({
          message: 'Validation failed',
          errors: error.messages,
        })
      }

      // Handle artists not found
      if (error.message.includes('Artists not found')) {
        return response.badRequest({
          message: error.message,
          error: 'ARTISTS_NOT_FOUND',
        })
      }

      // Handle other errors
      return response.internalServerError({
        message: 'An error occurred while adding artists to event',
        error: error.message,
      })
    }
  }
}
