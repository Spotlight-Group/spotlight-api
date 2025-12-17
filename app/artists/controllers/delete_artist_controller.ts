import { HttpContext } from '@adonisjs/core/http'
import { ArtistsService } from '#artists/services/artists_service'
import { inject } from '@adonisjs/core'
import { artistIdValidator } from '#artists/validators/artists'

@inject()
export default class DeleteArtistController {
  constructor(protected artistsService: ArtistsService) {}

  /**
   * @destroy
   * @summary Delete an artist
   * @description Delete an existing artist by its ID
   * @tag Artists
   * @paramPath id - The ID of the artist to delete - @type(number) @required
   * @responseBody 200 - {"message": "Artist deleted successfully", "data": {"id": 1, "deleted": true}} - Artist deleted successfully
   * @responseBody 400 - {"message": "Invalid artist ID", "error": "INVALID_ARTIST_ID"} - Invalid artist ID provided
   * @responseBody 404 - {"message": "Artist not found", "error": "ARTIST_NOT_FOUND"} - Artist not found
   * @responseBody 500 - {"message": "An error occurred while deleting the artist", "error": "string"} - Internal server error
   */
  async handle({ request, response, params }: HttpContext): Promise<void> {
    try {
      const { id: artistId } = await request.validateUsing(artistIdValidator, {
        data: params,
      })

      const deleted = await this.artistsService.delete(artistId)

      if (!deleted) {
        return response.notFound({
          message: 'Artist not found',
          error: 'ARTIST_NOT_FOUND',
        })
      }

      return response.ok({
        message: 'Artist deleted successfully',
        data: {
          id: artistId,
          deleted: true,
        },
      })
    } catch (error) {
      // Handle other errors
      return response.internalServerError({
        message: 'An error occurred while deleting the artist',
        error: error.message,
      })
    }
  }
}
