import { HttpContext } from '@adonisjs/core/http'
import { getMessagesByEventValidator } from '#messages/validators/messages'
import { eventIdValidator } from '#events/validators/events'
import { MessagesService } from '#messages/services/messages_service'
import { inject } from '@adonisjs/core'

@inject()
export default class GetMessagesController {
  constructor(protected messagesService: MessagesService) {}

  /**
   * @index
   * @summary Get messages by event ID
   * @description Retrieve a paginated list of messages for a specific event
   * @tag Messages
   * @paramPath eventId - Event ID to get messages for - @type(string) @example(evt_123456789)
   * @paramQuery page - Page number for pagination - @type(number) @example(1)
   * @paramQuery limit - Number of messages per page - @type(number) @example(20)
   * @responseBody 200 - <Message[]>.paginated() - Messages retrieved successfully
   * @responseBody 400 - {"message": "Validation failed", "errors": []} - Validation errors
   * @responseBody 401 - Unauthorized - Invalid or missing token
   * @responseBody 500 - {"message": "An error occurred while retrieving messages", "error": "string"} - Internal server error
   */
  async handle({ request, response, params, auth }: HttpContext): Promise<void> {
    try {
      await auth.authenticate()

      const { id: eventId } = await request.validateUsing(eventIdValidator, {
        data: params,
      })

      const queryParams = await request.validateUsing(getMessagesByEventValidator)

      const messages = await this.messagesService.getByEventId(eventId.toString(), queryParams)

      return response.ok({
        message: 'Messages retrieved successfully',
        data: messages.all(),
        meta: {
          total: messages.total,
          perPage: messages.perPage,
          currentPage: messages.currentPage,
          lastPage: messages.lastPage,
          firstPage: messages.firstPage,
          hasPages: messages.hasPages,
          hasMorePages: messages.hasMorePages,
          isEmpty: messages.isEmpty,
        },
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
        message: 'An error occurred while retrieving messages',
        error: error.message,
      })
    }
  }
}
