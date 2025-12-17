import { HttpContext } from '@adonisjs/core/http'
import { createArtistValidator } from '#artists/validators/artists'
import { ArtistsService } from '#artists/services/artists_service'
import { inject } from '@adonisjs/core'

@inject()
export default class CreateArtistController {
  constructor(protected artistsService: ArtistsService) {}

  /**
   * @store
   * @summary Create a new artist
   * @description Create a new artist with name and image
   * @tag Artists
   * @requestFormDataBody {"name":{"type":"string","minLength":2,"maxLength":255},"image":{"type":"string","format":"binary","description":"Artist image (required)"}}
   * @responseBody 201 - <Artist> - Artist created successfully
   * @responseBody 400 - {"message": "Artist image is required", "error": "MISSING_IMAGE_FILE"} - Artist image is required
   * @responseBody 400 - {"message": "Validation failed", "errors": []} - Validation errors
   * @responseBody 500 - {"message": "An error occurred while creating the artist", "error": "string"} - Internal server error
   */
  async handle({ request, response }: HttpContext): Promise<void> {
    try {
      const payload = await request.validateUsing(createArtistValidator)

      const image = request.file('image')
      if (!image) {
        return response.badRequest({
          message: 'Artist image is required',
          error: 'MISSING_IMAGE_FILE',
        })
      }

      const artist = await this.artistsService.create(payload, image)

      return response.created({
        message: 'Artist created successfully',
        data: artist,
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
        message: 'An error occurred while creating the artist',
        error: error.message,
      })
    }
  }
}
