import { HttpContext } from '@adonisjs/core/http'
import { messageIdValidator } from '#messages/validators/messages'
import { MessagesService } from '#messages/services/messages_service'
import { inject } from '@adonisjs/core'

@inject()
export default class DeleteMessageController {
  constructor(protected messagesService: MessagesService) {}

  /**
   * @destroy
   * @summary Delete a message
   * @description Delete a message (only by the message owner)
   * @tag Messages
   * @paramPath id - Message ID - @type(string) @example(msg_123456789)
   * @responseBody 200 - {"message": "Message deleted successfully"} - Message deleted successfully
   * @responseBody 400 - {"message": "Validation failed", "errors": []} - Validation errors
   * @responseBody 401 - Unauthorized - Invalid or missing token
   * @responseBody 403 - {"message": "Forbidden: You can only delete your own messages"} - Unauthorized to delete this message
   * @responseBody 404 - {"message": "Message not found"} - Message not found
   * @responseBody 500 - {"message": "An error occurred while deleting the message", "error": "string"} - Internal server error
   */
  async handle({ request, response, params, auth }: HttpContext): Promise<void> {
    try {
      const user = await auth.authenticate()

      const { id: messageId } = await request.validateUsing(messageIdValidator, {
        data: params,
      })

      const deleted = await this.messagesService.delete(messageId, user.id.toString())

      if (!deleted) {
        return response.notFound({
          message: 'Message not found',
        })
      }

      return response.ok({
        message: 'Message deleted successfully',
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
          message: 'Forbidden: You can only delete your own messages',
        })
      }

      // Handle other errors
      return response.internalServerError({
        message: 'An error occurred while deleting the message',
        error: error.message,
      })
    }
  }
}
