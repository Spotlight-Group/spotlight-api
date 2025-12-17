import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { EventsService } from '#events/services/events_service'
import { eventIdValidator } from '#events/validators/events'
import vine from '@vinejs/vine'

const removeEventArtistsValidator = vine.compile(
  vine.object({
    artistIds: vine.array(vine.number().min(1)).minLength(1),
  })
)

@inject()
export default class RemoveEventArtistsController {
  constructor(protected eventsService: EventsService) {}

  /**
   * @delete
   * @summary Remove artists from an event
   * @description Remove one or more artists from an existing event
   * @tag Events
   * @paramPath id - The ID of the event - @type(number) @required
   * @requestBody {"artistIds": [1, 2, 3]}
   * @responseBody 200 - {"message": "Artists removed from event successfully", "data": <Event>} - Artists removed successfully
   * @responseBody 400 - {"message": "Invalid event ID", "error": "INVALID_EVENT_ID"} - Invalid event ID provided
   * @responseBody 400 - {"message": "Validation failed", "errors": []} - Validation errors
   * @responseBody 404 - {"message": "Event not found", "error": "EVENT_NOT_FOUND"} - Event not found
   * @responseBody 500 - {"message": "An error occurred while removing artists from event", "error": "string"} - Internal server error
   */
  async handle({ request, response, params }: HttpContext): Promise<void> {
    try {
      const { id: eventId } = await request.validateUsing(eventIdValidator, {
        data: params,
      })

      // Validate request body
      const { artistIds } = await request.validateUsing(removeEventArtistsValidator)

      // Get current event
      const event = await this.eventsService.getById(eventId)
      if (!event) {
        return response.notFound({
          message: 'Event not found',
          error: 'EVENT_NOT_FOUND',
        })
      }

      // Load current artists
      await event.load('artists')
      const currentArtistIds = event.artists.map((ea) => ea.artistId)

      // Filter out artists that are not associated with the event
      const artistsToRemove = artistIds.filter((id) => currentArtistIds.includes(id))

      if (artistsToRemove.length === 0) {
        return response.badRequest({
          message: 'None of the specified artists are associated with this event',
          error: 'ARTISTS_NOT_ASSOCIATED',
        })
      }

      // Remove specified artists from current ones
      const remainingArtistIds = currentArtistIds.filter((id) => !artistIds.includes(id))

      // Update event with remaining artist associations
      const updatedEvent = await this.eventsService.update(eventId, {
        artistIds: remainingArtistIds,
      })

      return response.ok({
        message: 'Artists removed from event successfully',
        data: updatedEvent,
        removedArtistIds: artistsToRemove,
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
        message: 'An error occurred while removing artists from event',
        error: error.message,
      })
    }
  }
}
