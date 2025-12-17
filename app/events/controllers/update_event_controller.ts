import { HttpContext } from '@adonisjs/core/http'
import { eventIdValidator, updateEventValidator } from '#events/validators/events'
import { EventsService } from '#events/services/events_service'
import { inject } from '@adonisjs/core'

@inject()
export default class UpdateEventController {
  constructor(protected eventsService: EventsService) {}

  /**
   * @update
   * @summary Update an existing event
   * @description Update an event with new information including optional banner image upload
   * @tag Events
   * @paramPath id - The ID of the event to update - @type(number) @required
   * @requestBody <Event>
   * @requestFormDataBody {"title":{"type":"string","minLength":3,"maxLength":255},"description":{"type":"string","maxLength":1000},"startDate":{"type":"string","format":"date"},"endDate":{"type":"string","format":"date"},"startHour":{"type":"string","format":"date-time"},"latitude":{"type":"number","minimum":-90,"maximum":90},"longitude":{"type":"number","minimum":-180,"maximum":180},"placeName":{"type":"string","minLength":2,"maxLength":255},"address":{"type":"string","minLength":5,"maxLength":255},"city":{"type":"string","minLength":2,"maxLength":100},"type":{"type":"string","enum":["concert","festival","exhibition","conference"]},"subtype":{"type":"string","enum":["rock","hiphop","jazz","techno","classical"]},"banner":{"type":"string","format":"binary"}}
   * @responseBody 200 - <Event> - Event updated successfully
   * @responseBody 400 - {"message": "Invalid event ID", "error": "INVALID_EVENT_ID"} - Invalid event ID provided
   * @responseBody 400 - {"message": "Validation failed", "errors": []} - Validation errors
   * @responseBody 400 - {"message": "File upload failed", "error": "string"} - Banner upload failed
   * @responseBody 404 - {"message": "Event not found", "error": "EVENT_NOT_FOUND"} - Event not found
   * @responseBody 500 - {"message": "An error occurred while updating the event", "error": "string"} - Internal server error
   */
  async handle({ request, response, params }: HttpContext): Promise<void> {
    try {
      const { id: eventId } = await request.validateUsing(eventIdValidator, {
        data: params,
      })

      const payload = await request.validateUsing(updateEventValidator)
      const banner = request.file('banner')

      const event = await this.eventsService.update(eventId, payload, banner || undefined)

      return response.ok({
        message: 'Event updated successfully',
        data: event,
      })
    } catch (error) {
      // Handle validation errors
      if (error.messages) {
        return response.badRequest({
          message: 'Validation failed',
          errors: error.messages,
        })
      }

      // Handle event not found
      if (error.message === 'Event not found') {
        return response.notFound({
          message: 'Event not found',
          error: 'EVENT_NOT_FOUND',
        })
      }

      // Handle file upload errors
      if (error.message.includes('Failed to upload banner image')) {
        return response.badRequest({
          message: 'File upload failed',
          error: error.message,
        })
      }

      // Handle other errors
      return response.internalServerError({
        message: 'An error occurred while updating the event',
        error: error.message,
      })
    }
  }
}
