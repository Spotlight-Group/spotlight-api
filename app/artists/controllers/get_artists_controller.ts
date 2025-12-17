import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { ArtistsService } from '#artists/services/artists_service'
import vine from '@vinejs/vine'

const getArtistsValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(100).optional(),
    name: vine.string().trim().minLength(1).optional(),
  })
)

@inject()
export default class GetArtistsController {
  constructor(protected artistsService: ArtistsService) {}

  /**
   * @index
   * @summary Get all artists
   * @description Retrieve a paginated list of artists with optional filtering by name
   * @tag Artists
   * @queryParam page - Page number for pagination - @type(number) @default(1)
   * @queryParam limit - Number of artists per page (max 100) - @type(number) @default(20)
   * @queryParam name - Filter by artist name (partial match) - @type(string)
   * @responseBody 200 - {"message": "Artists retrieved successfully", "data": {"data": [<Artist>], "meta": {}}} - Artists retrieved successfully
   * @responseBody 400 - {"message": "Validation failed", "errors": []} - Validation errors
   * @responseBody 500 - {"message": "An error occurred while retrieving artists", "error": "string"} - Internal server error
   */
  async handle({ request, response }: HttpContext): Promise<void> {
    try {
      const { page, limit, name } = await request.validateUsing(getArtistsValidator, {
        data: request.qs(),
      })

      const artists = await this.artistsService.getAll({
        page: page || 1,
        limit: limit || 20,
        name,
      })

      return response.ok({
        message: 'Artists retrieved successfully',
        data: artists,
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
        message: 'An error occurred while retrieving artists',
        error: error.message,
      })
    }
  }
}
