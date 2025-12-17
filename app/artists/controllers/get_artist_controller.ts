import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { ArtistsService } from '#artists/services/artists_service'
import { artistIdValidator } from '#artists/validators/artists'

@inject()
export default class GetArtistController {
  constructor(protected artistsService: ArtistsService) {}

  /**
   * @show
   * @summary Get a single artist
   * @description Retrieve detailed information about a specific artist by ID
   * @tag Artists
   * @paramPath id - The ID of the artist - @type(number) @required
   * @responseBody 200 - {"message": "Artist retrieved successfully", "data": <Artist>} - Artist retrieved successfully
   * @responseBody 400 - {"message": "Invalid artist ID", "error": "INVALID_ARTIST_ID"} - Invalid artist ID provided
   * @responseBody 404 - {"message": "Artist not found", "error": "ARTIST_NOT_FOUND"} - Artist not found
   * @responseBody 500 - {"message": "An error occurred while retrieving the artist", "error": "string"} - Internal server error
   */
  async handle({ request, response, params }: HttpContext): Promise<void> {
    try {
      const { id: artistId } = await request.validateUsing(artistIdValidator, {
        data: params,
      })

      const artist = await this.artistsService.getById(artistId)

      if (!artist) {
        return response.notFound({
          message: 'Artist not found',
          error: 'ARTIST_NOT_FOUND',
        })
      }

      return response.ok({
        message: 'Artist retrieved successfully',
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
        message: 'An error occurred while retrieving the artist',
        error: error.message,
      })
    }
  }
}
