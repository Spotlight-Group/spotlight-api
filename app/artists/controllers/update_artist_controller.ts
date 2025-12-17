import { HttpContext } from '@adonisjs/core/http'
import { artistIdValidator, updateArtistValidator } from '#artists/validators/artists'
import { ArtistsService } from '#artists/services/artists_service'
import { inject } from '@adonisjs/core'

@inject()
export default class UpdateArtistController {
  constructor(protected artistsService: ArtistsService) {}

  /**
   * @update
   * @summary Update an existing artist
   * @description Update an artist with new information including optional image upload
   * @tag Artists
   * @paramPath id - The ID of the artist to update - @type(number) @required
   * @requestBody <Artist>
   * @requestFormDataBody {"name":{"type":"string","minLength":2,"maxLength":255},"image":{"type":"string","format":"binary"}}
   * @responseBody 200 - <Artist> - Artist updated successfully
   * @responseBody 400 - {"message": "Invalid artist ID", "error": "INVALID_ARTIST_ID"} - Invalid artist ID provided
   * @responseBody 400 - {"message": "Validation failed", "errors": []} - Validation errors
   * @responseBody 400 - {"message": "File upload failed", "error": "string"} - Image upload failed
   * @responseBody 404 - {"message": "Artist not found", "error": "ARTIST_NOT_FOUND"} - Artist not found
   * @responseBody 500 - {"message": "An error occurred while updating the artist", "error": "string"} - Internal server error
   */
  async handle({ request, response, params }: HttpContext): Promise<void> {
    try {
      const { id: artistId } = await request.validateUsing(artistIdValidator, {
        data: params,
      })

      const payload = await request.validateUsing(updateArtistValidator)
      const image = request.file('image')

      const artist = await this.artistsService.update(artistId, payload, image || undefined)

      return response.ok({
        message: 'Artist updated successfully',
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

      // Handle artist not found
      if (error.message === 'Artist not found') {
        return response.notFound({
          message: 'Artist not found',
          error: 'ARTIST_NOT_FOUND',
        })
      }

      // Handle file upload errors
      if (error.message.includes('Failed to upload artist image')) {
        return response.badRequest({
          message: 'File upload failed',
          error: error.message,
        })
      }

      // Handle other errors
      return response.internalServerError({
        message: 'An error occurred while updating the artist',
        error: error.message,
      })
    }
  }
}
