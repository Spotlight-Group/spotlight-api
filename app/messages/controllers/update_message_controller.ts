import { HttpContext } from '@adonisjs/core/http'
import { updateMessageValidator, messageIdValidator } from '#messages/validators/messages'
import { MessagesService } from '#messages/services/messages_service'
import { inject } from '@adonisjs/core'

@inject()
export default class UpdateMessageController {
  constructor(protected messagesService: MessagesService) {}

  /**
   * @update
   * @summary Update a message
   * @description Update a message content (only by the message owner)
   * @tag Messages
   * @paramPath id - Message ID - @type(string) @example(msg_123456789)
   * @requestBody {"content": {"type": "string", "minLength": 1, "maxLength": 1000, "description": "Updated message content"}}
   * @responseBody 200 - <Message> - Message updated successfully
   * @responseBody 400 - {"message": "Validation failed", "errors": []} - Validation errors
   * @responseBody 401 - Unauthorized - Invalid or missing token
   * @responseBody 403 - {"message": "Forbidden: You can only update your own messages"} - Unauthorized to update this message
   * @responseBody 404 - {"message": "Message not found"} - Message not found
   * @responseBody 500 - {"message": "An error occurred while updating the message", "error": "string"} - Internal server error
   */
  async handle({ request, response, params, auth }: HttpContext): Promise<void> {
    try {
      const user = await auth.authenticate()

      const { id } = await request.validateUsing(messageIdValidator, {
        data: params,
      })

      const payload = await request.validateUsing(updateMessageValidator)

      const message = await this.messagesService.update(id, payload, user.id.toString())

      if (!message) {
        return response.notFound({
          message: 'Message not found',
        })
      }

      return response.ok({
        message: 'Message updated successfully',
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

      // Handle authorization errors
      if (error.message.includes('Unauthorized')) {
        return response.forbidden({
          message: 'Forbidden: You can only update your own messages',
        })
      }

      // Handle other errors
      return response.internalServerError({
        message: 'An error occurred while updating the message',
        error: error.message,
      })
    }
  }
}
