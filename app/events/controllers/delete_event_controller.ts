import { HttpContext } from '@adonisjs/core/http'
import { EventsService } from '#events/services/events_service'
import { eventIdValidator } from '#events/validators/events'
import { inject } from '@adonisjs/core'

@inject()
export default class DeleteEventController {
  constructor(protected eventsService: EventsService) {}

  /**
   * @destroy
   * @summary Delete an event
   * @description Delete an existing event by its ID
   * @tag Events
   * @paramPath id - The ID of the event to delete - @type(number) @required
   * @responseBody 200 - {"message": "Event deleted successfully", "data": {"id": 1, "deleted": true}} - Event deleted successfully
   * @responseBody 400 - {"message": "Invalid event ID", "error": "INVALID_EVENT_ID"} - Invalid event ID provided
   * @responseBody 404 - {"message": "Event not found", "error": "EVENT_NOT_FOUND"} - Event not found
   * @responseBody 500 - {"message": "An error occurred while deleting the event", "error": "string"} - Internal server error
   */
  async handle({ request, response, params }: HttpContext): Promise<void> {
    try {
      const { id: eventId } = await request.validateUsing(eventIdValidator, {
        data: params,
      })

      const deleted = await this.eventsService.delete(eventId)

      if (!deleted) {
        return response.notFound({
          message: 'Event not found',
          error: 'EVENT_NOT_FOUND',
        })
      }

      return response.ok({
        message: 'Event deleted successfully',
        data: {
          id: eventId,
          deleted: true,
        },
      })
    } catch (error) {
      // Handle other errors
      return response.internalServerError({
        message: 'An error occurred while deleting the event',
        error: error.message,
      })
    }
  }
}
