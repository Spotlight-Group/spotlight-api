import { HttpContext } from '@adonisjs/core/http'
import { messageIdValidator } from '#messages/validators/messages'
import { MessagesService } from '#messages/services/messages_service'
import { inject } from '@adonisjs/core'

@inject()
export default class GetMessageController {
  constructor(protected messagesService: MessagesService) {}

  /**
   * @show
   * @summary Get a single message
   * @description Retrieve a specific message by its ID
   * @tag Messages
   * @paramPath id - Message ID - @type(string) @example(msg_123456789)
   * @responseBody 200 - <Message> - Message retrieved successfully
   * @responseBody 400 - {"message": "Validation failed", "errors": []} - Validation errors
   * @responseBody 401 - Unauthorized - Invalid or missing token
   * @responseBody 404 - {"message": "Message not found"} - Message not found
   * @responseBody 500 - {"message": "An error occurred while retrieving the message", "error": "string"} - Internal server error
   */
  async handle({ request, response, params, auth }: HttpContext): Promise<void> {
    try {
      await auth.authenticate()

      const { id: messageId } = await request.validateUsing(messageIdValidator, {
        data: params,
      })

      const message = await this.messagesService.getById(messageId)

      if (!message) {
        return response.notFound({
          message: 'Message not found',
        })
      }

      return response.ok({
        message: 'Message retrieved successfully',
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
        message: 'An error occurred while retrieving the message',
        error: error.message,
      })
    }
  }
}
