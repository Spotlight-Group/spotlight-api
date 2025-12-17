import { HttpContext } from '@adonisjs/core/http'
import { createEventValidator } from '#events/validators/events'
import { EventsService } from '#events/services/events_service'
import { inject } from '@adonisjs/core'

@inject()
export default class CreateEventController {
  constructor(protected eventsService: EventsService) {}

  /**
   * @store
   * @summary Create a new event
   * @description Create a new event with all required information and banner image
   * @tag Events
   * @requestFormDataBody {"title":{"type":"string","minLength":3,"maxLength":255},"description":{"type":"string","maxLength":1000},"startDate":{"type":"string","format":"date"},"endDate":{"type":"string","format":"date"},"startHour":{"type":"string","format":"date-time"},"latitude":{"type":"number","minimum":-90,"maximum":90},"longitude":{"type":"number","minimum":-180,"maximum":180},"placeName":{"type":"string","minLength":2,"maxLength":255},"address":{"type":"string","minLength":5,"maxLength":255},"city":{"type":"string","minLength":2,"maxLength":100},"type":{"type":"string","enum":["concert","festival","exhibition","conference"]},"subtype":{"type":"string","enum":["rock","hiphop","jazz","techno","classical"]},"banner":{"type":"string","format":"binary","description":"Event banner image (required)"}}
   * @responseBody 201 - <Event> - Event created successfully
   * @responseBody 400 - {"message": "Banner image is required", "error": "MISSING_BANNER_FILE"} - Banner image is required
   * @responseBody 400 - {"message": "Validation failed", "errors": []} - Validation errors
   * @responseBody 500 - {"message": "An error occurred while creating the event", "error": "string"} - Internal server error
   */
  async handle({ request, response }: HttpContext): Promise<void> {
    try {
      const payload = await request.validateUsing(createEventValidator)

      const banner = request.file('banner')
      if (!banner) {
        return response.badRequest({
          message: 'Banner image is required',
          error: 'MISSING_BANNER_FILE',
        })
      }

      const event = await this.eventsService.create(payload, banner)

      return response.created({
        message: 'Event created successfully',
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

      // Handle other errors
      return response.internalServerError({
        message: 'An error occurred while creating the event',
        error: error.message,
      })
    }
  }
}
