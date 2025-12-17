import Message from '#messages/models/message'
import { inject } from '@adonisjs/core'
import { cuid } from '@adonisjs/core/helpers'
import AuthorizationException from '#exceptions/authorization_exception'

export class MessageDto {
  declare content: string
}

export class CreateMessageDto extends MessageDto {
  declare eventId: string
}

export class UpdateMessageDto extends MessageDto {}

export class MessagePaginationOptions {
  declare page?: number
  declare limit?: number
}

@inject()
export class MessagesService {
  /**
   * Crée un nouveau message
   */
  async create(data: CreateMessageDto, userId: string): Promise<Message> {
    const message = new Message()
    message.id = cuid()
    message.userId = userId
    message.eventId = data.eventId
    message.content = data.content

    await message.save()
    return this.loadRelations(message)
  }

  /**
   * Récupère les messages d'un événement avec pagination
   */
  async getByEventId(eventId: string, options: Partial<MessagePaginationOptions> = {}) {
    const { page = 1, limit = 20 } = options

    return await Message.query()
      .where('eventId', eventId)
      .preload('user')
      .preload('event')
      .orderBy('createdAt', 'desc')
      .paginate(page, limit)
  }

  /**
   * Récupère un message par son identifiant
   */
  async getById(id: string): Promise<Message | null> {
    return Message.query().where('id', id).preload('user').preload('event').first()
  }

  /**
   * Met à jour un message si l'utilisateur en est le propriétaire
   */
  async update(id: string, data: UpdateMessageDto, userId: string): Promise<Message | null> {
    const message = await Message.find(id)

    if (!message) {
      return null
    }

    this.verifyMessageOwnership(message, userId)

    message.content = data.content
    await message.save()

    return this.loadRelations(message)
  }

  /**
   * Supprime un message si l'utilisateur en est le propriétaire
   * @returns true si le message a été supprimé, false s'il n'existe pas
   */
  async delete(id: string, userId: string): Promise<boolean> {
    const message = await Message.find(id)

    if (!message) {
      return false
    }

    this.verifyMessageOwnership(message, userId)
    await message.delete()

    return true
  }

  /**
   * Charge les relations utilisateur et événement pour un message
   * @private
   */
  private async loadRelations(message: Message): Promise<Message> {
    await message.load('user')
    await message.load('event')
    return message
  }

  /**
   * Vérifie si l'utilisateur est autorisé à modifier ou supprimer un message
   * @private
   */
  private verifyMessageOwnership(message: Message, userId: string): void {
    if (message.userId !== userId) {
      throw new AuthorizationException('Unauthorized: You can only manage your own messages')
    }
  }
}
