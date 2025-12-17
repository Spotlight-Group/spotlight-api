import { HttpContext } from '@adonisjs/core/http'
import { createMessageValidator } from '#messages/validators/messages'
import { MessagesService } from '#messages/services/messages_service'
import { inject } from '@adonisjs/core'

@inject()
export default class CreateMessageController {
  constructor(protected messagesService: MessagesService) {}

  /**
   * @store
   * @summary Create a new message
   * @description Create a new message for an event
   * @tag Messages
   * @requestBody {"eventId": {"type": "string", "description": "Event ID to post message to"}, "content": {"type": "string", "minLength": 1, "maxLength": 1000, "description": "Message content"}}
   * @responseBody 201 - <Message> - Message created successfully
   * @responseBody 400 - {"message": "Validation failed", "errors": []} - Validation errors
   * @responseBody 401 - Unauthorized - Invalid or missing token
   * @responseBody 500 - {"message": "An error occurred while creating the message", "error": "string"} - Internal server error
   */
  async handle({ request, response, auth }: HttpContext): Promise<void> {
    try {
      const payload = await request.validateUsing(createMessageValidator)
      const user = await auth.authenticate()

      const message = await this.messagesService.create(payload, user.id.toString())

      return response.created({
        message: 'Message created successfully',
        data: message,
      })
    } catch (error) {
      // Handle validation errors
      if (error.messages) {
        return response.badRequest({
          message: 'Validation failed',
          errors: error.messages,
        })
      }

      // Handle authentication errors
      if (error.code === 'E_UNAUTHORIZED_ACCESS') {
        return response.unauthorized({
          message: 'Authentication required',
        })
      }

      // Handle other errors
      return response.internalServerError({
        message: 'An error occurred while creating the message',
        error: error.message,
      })
    }
  }
}
