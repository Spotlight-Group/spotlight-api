import Artist from '#artists/models/artist'
import { MultipartFile } from '@adonisjs/core/bodyparser'
import { inject } from '@adonisjs/core'
import { DriveService } from '#core/services/drive_service'
import NotFoundException from '#exceptions/not_found_exception'
import BadRequestException from '#exceptions/bad_request_exception'

export interface CreateArtistData {
  name: string
}

export interface CreateArtistFromUrlData {
  name: string
  imageUrl: string
}

export interface UpdateArtistData {
  name?: string
}

export interface GetArtistsOptions {
  page?: number
  limit?: number
  name?: string
}

@inject()
export class ArtistsService {
  private readonly ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
  private readonly UPLOADS_PATH = 'uploads/artists'
  private readonly UPLOADS_URL_PREFIX = '/uploads/artists/'

  constructor(private driveService: DriveService) {}

  /**
   * Stores a new artist in the database.
   * @param data - The artist data excluding the image.
   * @param image - The image file to be uploaded.
   * @return A promise that resolves to the created Artist instance.
   * @throws Error if image is not provided or file upload fails
   */
  async create(data: CreateArtistData, image: MultipartFile): Promise<Artist> {
    if (!image) {
      throw new BadRequestException('Artist image is required')
    }

    // Create an artist record
    const artist = await Artist.create({
      name: data.name,
      image: '', // Will be updated after file upload
    })

    try {
      // Upload image and update artist
      const uploadConfig = {
        uploadsPath: this.UPLOADS_PATH,
        allowedExtensions: this.ALLOWED_IMAGE_EXTENSIONS,
        urlPrefix: this.UPLOADS_URL_PREFIX,
        entityType: 'artist',
        entityId: artist.id,
      }
      artist.image = await this.driveService.uploadFile(image, uploadConfig)
      await artist.save()
      return artist
    } catch (error) {
      // If file upload fails, delete the created artist to maintain consistency
      await artist.delete()
      throw new BadRequestException(`Failed to upload artist image: ${error.message}`)
    }
  }

  /**
   * Creates or finds an existing artist with URL-based image (for a scraper use case)
   * @param data - The artist data with image URL
   * @return A promise that resolves to the Artist instance
   */
  async createOrFindFromUrl(data: CreateArtistFromUrlData): Promise<Artist> {
    // Check if an artist already exists
    let artist = await Artist.query().where('name', data.name).first()

    if (!artist) {
      // Create a new artist with URL-based image
      artist = await Artist.create({
        name: data.name,
        image: data.imageUrl,
      })
    }

    return artist
  }

  /**
   * Retrieves all artists with optional filtering and pagination.
   * @param options - Filtering and pagination options.
   * @return A promise that resolves to paginated artists.
   */
  async getAll(options: GetArtistsOptions = {}) {
    const { page = 1, limit = 20, name } = options
    const query = Artist.query()

    // Apply filters
    if (name) {
      query.whereILike('name', `%${name}%`)
    }

    // Order by name
    query.orderBy('name', 'asc')

    // Apply pagination
    return await query.paginate(page, limit)
  }

  /**
   * Retrieves a single artist by ID.
   * @param id - The artist ID.
   * @return A promise that resolves to the Artist instance or null if not found.
   */
  async getById(id: number): Promise<Artist | null> {
    return await Artist.find(id)
  }

  /**
   * Updates an existing artist.
   * @param id - The artist ID.
   * @param data - The updated artist data.
   * @param image - Optional new image file.
   * @return A promise that resolves to the updated Artist instance.
   * @throws Error if artist is not found or update fails
   */
  async update(id: number, data: UpdateArtistData, image?: MultipartFile): Promise<Artist> {
    const artist = await Artist.find(id)
    if (!artist) {
      throw new NotFoundException('Artist not found')
    }

    // Update artist fields
    if (data.name !== undefined) artist.name = data.name

    // Handle image update if provided
    if (image) {
      try {
        const uploadConfig = {
          uploadsPath: this.UPLOADS_PATH,
          allowedExtensions: this.ALLOWED_IMAGE_EXTENSIONS,
          urlPrefix: this.UPLOADS_URL_PREFIX,
          entityType: 'artist',
          entityId: artist.id,
        }
        // Replace old image with new one
        artist.image = await this.driveService.replaceFile(image, uploadConfig, artist.image)
      } catch (error) {
        throw new BadRequestException(`Failed to upload artist image: ${error.message}`)
      }
    }

    await artist.save()
    return artist
  }

  /**
   * Deletes an artist by ID and their associated image.
   * @param id - The artist ID.
   * @return A promise that resolves to true if deleted, false if not found.
   */
  async delete(id: number): Promise<boolean> {
    const artist = await Artist.find(id)
    if (!artist) {
      return false
    }

    // Delete the artist image file if it exists
    const uploadConfig = {
      uploadsPath: this.UPLOADS_PATH,
      allowedExtensions: this.ALLOWED_IMAGE_EXTENSIONS,
      urlPrefix: this.UPLOADS_URL_PREFIX,
      entityType: 'artist',
      entityId: id,
    }
    await this.driveService.deleteFile(artist.image, uploadConfig, id)

    await artist.delete()
    return true
  }
}
