import Event from '#events/models/event'
import EventArtist from '#events/models/event_artist'
import Artist from '#artists/models/artist'
import { MultipartFile } from '@adonisjs/core/bodyparser'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import { EventType, EventSubtype } from '#events/enums/events'
import { DriveService } from '#core/services/drive_service'
import NotFoundException from '#exceptions/not_found_exception'
import BadRequestException from '#exceptions/bad_request_exception'

export interface CreateEventData {
  title: string
  description?: string | null
  startDate: Date
  endDate: Date
  startHour: Date
  openHour?: Date | null
  latitude: number
  longitude: number
  placeName: string
  address: string
  city: string
  type: EventType
  subtype: EventSubtype
  artistIds?: number[]
}

export interface CreateEventFromUrlData {
  title: string
  description?: string | null
  startDate: Date
  endDate: Date
  startHour: Date
  openHour?: Date | null
  latitude: number
  longitude: number
  placeName: string
  address: string
  city: string
  type: EventType
  subtype: EventSubtype
  bannerUrl: string
  artistIds?: number[]
}

export interface UpdateEventData {
  title?: string
  description?: string | null
  startDate?: Date
  endDate?: Date
  startHour?: Date
  openHour?: Date | null
  latitude?: number
  longitude?: number
  placeName?: string
  address?: string
  city?: string
  type?: EventType
  subtype?: EventSubtype
  artistIds?: number[]
}

export interface GetEventsOptions {
  page?: number
  limit?: number
  type?: EventType
  subtype?: EventSubtype
  city?: string
  startDate?: Date
  endDate?: Date
  userId?: number
}

@inject()
export class EventsService {
  private readonly ALLOWED_BANNER_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
  private readonly UPLOADS_PATH = 'uploads/events'
  private readonly UPLOADS_URL_PREFIX = '/uploads/events/'

  constructor(private driveService: DriveService) {}

  /**
   * Validates that all provided artist IDs exist in the database
   * @param artistIds - Array of artist IDs to validate
   * @throws Error if any artist IDs are not found
   */
  private async validateArtistsExist(artistIds: number[]): Promise<void> {
    if (artistIds.length === 0) return

    const existingArtists = await Artist.query().whereIn('id', artistIds)
    if (existingArtists.length !== artistIds.length) {
      const existingIds = existingArtists.map((artist) => artist.id)
      const missingIds = artistIds.filter((artistId) => !existingIds.includes(artistId))
      throw new NotFoundException(`Artists not found: ${missingIds.join(', ')}`)
    }
  }

  /**
   * Stores a new event in the database.
   * @param data - The event data excluding the banner.
   * @param banner - The banner file to be uploaded.
   * @return A promise that resolves to the created Event instance.
   * @throws Error if banner is not provided or file upload fails
   */
  async create(data: CreateEventData, banner: MultipartFile): Promise<Event> {
    if (!banner) {
      throw new BadRequestException('Banner image is required')
    }

    // Validate artists exist if provided
    if (data.artistIds && data.artistIds.length > 0) {
      await this.validateArtistsExist(data.artistIds)
    }

    // Create an event record
    const event = await Event.create({
      title: data.title,
      description: data.description ?? null,
      startDate: DateTime.fromJSDate(data.startDate),
      endDate: DateTime.fromJSDate(data.endDate),
      startHour: DateTime.fromJSDate(data.startHour),
      openHour: data.openHour ? DateTime.fromJSDate(data.openHour) : null,
      latitude: data.latitude,
      longitude: data.longitude,
      placeName: data.placeName,
      address: data.address,
      city: data.city,
      type: data.type,
      subtype: data.subtype,
    })

    try {
      // Upload banner file
      const uploadConfig = {
        uploadsPath: this.UPLOADS_PATH,
        allowedExtensions: this.ALLOWED_BANNER_EXTENSIONS,
        urlPrefix: this.UPLOADS_URL_PREFIX,
        entityType: 'event',
        entityId: event.id,
      }
      event.bannerUrl = await this.driveService.uploadFile(banner, uploadConfig)
      await event.save()

      // Create event-artist relationships if artists are provided
      if (data.artistIds && data.artistIds.length > 0) {
        const eventArtistData = data.artistIds.map((artistId) => ({
          eventId: event.id,
          artistId: artistId,
        }))
        await EventArtist.createMany(eventArtistData)
      }

      return event
    } catch (error) {
      // If file upload or artist association fails, delete the created event to maintain consistency
      await event.delete()
      throw new BadRequestException(
        `Failed to upload banner image or associate artists: ${error.message}`
      )
    }
  }

  /**
   * Creates an event with URL-based banner (for a scraper use case)
   * @param data - The event data with banner URL
   * @return A promise that resolves to the created Event instance
   * @throws Error if artist validation fails
   */
  async createFromUrl(data: CreateEventFromUrlData): Promise<Event> {
    // Validate artists exist if provided
    if (data.artistIds && data.artistIds.length > 0) {
      await this.validateArtistsExist(data.artistIds)
    }

    // Create an event record with URL-based banner
    const event = await Event.create({
      title: data.title,
      description: data.description ?? null,
      startDate: DateTime.fromJSDate(data.startDate),
      endDate: DateTime.fromJSDate(data.endDate),
      startHour: DateTime.fromJSDate(data.startHour),
      openHour: data.openHour ? DateTime.fromJSDate(data.openHour) : null,
      latitude: data.latitude,
      longitude: data.longitude,
      placeName: data.placeName,
      address: data.address,
      city: data.city,
      type: data.type,
      subtype: data.subtype,
      bannerUrl: data.bannerUrl,
    })

    try {
      // Create event-artist relationships if artists are provided
      if (data.artistIds && data.artistIds.length > 0) {
        const eventArtistData = data.artistIds.map((artistId) => ({
          eventId: event.id,
          artistId: artistId,
        }))
        await EventArtist.createMany(eventArtistData)
      }

      return event
    } catch (error) {
      // If the artist association fails, delete the created event to maintain consistency
      await event.delete()
      throw new BadRequestException(`Failed to associate artists: ${error.message}`)
    }
  }

  /**
   * Retrieves all events with optional filtering and pagination.
   * @param options - Filtering and pagination options.
   * @return A promise that resolves to paginated events.
   */
  async getAll(options: GetEventsOptions = {}) {
    const { page = 1, limit = 20, type, subtype, city, startDate, endDate, userId } = options

    // Enforce maximum limit to prevent excessive data retrieval
    const maxLimit = 100
    const safeLimit = Math.min(limit, maxLimit)

    const query = Event.query()

    // Apply filters
    if (type) {
      query.where('type', type)
    }

    if (subtype) {
      query.where('subtype', subtype)
    }

    if (city) {
      // Optimize city search: try exact match first (uses index), then partial match
      // This allows the index on 'city' column to be utilized for exact searches
      const normalizedCity = city.trim()
      query.where((builder) => {
        builder.where('city', normalizedCity).orWhereILike('city', `%${normalizedCity}%`)
      })
    }

    if (startDate) {
      query.where('startDate', '>=', DateTime.fromJSDate(startDate).toSQLDate()!)
    }

    if (endDate) {
      query.where('endDate', '<=', DateTime.fromJSDate(endDate).toSQLDate()!)
    }

    // Preload event_user relation if userId is provided
    if (userId) {
      query.preload('participants', (participantsQuery) => {
        participantsQuery.where('userId', userId)
      })
    }

    // Order by start date
    query.orderBy('startDate', 'asc')

    // Apply pagination
    return await query.paginate(page, safeLimit)
  }

  /**
   * Retrieves a single event by ID with all artists preloaded.
   * @param id - The event ID.
   * @param userId - Optional user ID to preload user-specific event data.
   * @return A promise that resolves to the Event instance or null if not found.
   */
  async getById(id: number, userId?: number): Promise<Event | null> {
    const query = Event.query()
      .where('id', id)
      .preload('artists', (artistsQuery) => {
        artistsQuery.preload('artist')
      })

    // Preload event_user relation if userId is provided
    if (userId) {
      query.preload('participants', (participantsQuery) => {
        participantsQuery.where('userId', userId)
      })
    }

    return await query.first()
  }

  /**
   * Updates an existing event.
   * @param id - The event ID.
   * @param data - The updated event data.
   * @param banner - Optional new banner file.
   * @return A promise that resolves to the updated Event instance.
   * @throws Error if event is not found or update fails
   */
  async update(id: number, data: UpdateEventData, banner?: MultipartFile): Promise<Event> {
    const event = await Event.find(id)
    if (!event) {
      throw new NotFoundException('Event not found')
    }

    // Validate artists exist if provided
    if (data.artistIds !== undefined && data.artistIds.length > 0) {
      await this.validateArtistsExist(data.artistIds)
    }

    // Update event fields
    if (data.title !== undefined) event.title = data.title
    if (data.description !== undefined) event.description = data.description
    if (data.startDate !== undefined) event.startDate = DateTime.fromJSDate(data.startDate)
    if (data.endDate !== undefined) event.endDate = DateTime.fromJSDate(data.endDate)
    if (data.startHour !== undefined) event.startHour = DateTime.fromJSDate(data.startHour)
    if (data.openHour !== undefined) {
      event.openHour = data.openHour ? DateTime.fromJSDate(data.openHour) : null
    }
    if (data.latitude !== undefined) event.latitude = data.latitude
    if (data.longitude !== undefined) event.longitude = data.longitude
    if (data.placeName !== undefined) event.placeName = data.placeName
    if (data.address !== undefined) event.address = data.address
    if (data.city !== undefined) event.city = data.city
    if (data.type !== undefined) event.type = data.type
    if (data.subtype !== undefined) event.subtype = data.subtype

    // Handle banner update if provided
    if (banner) {
      try {
        const uploadConfig = {
          uploadsPath: this.UPLOADS_PATH,
          allowedExtensions: this.ALLOWED_BANNER_EXTENSIONS,
          urlPrefix: this.UPLOADS_URL_PREFIX,
          entityType: 'event',
          entityId: event.id,
        }
        // Replace old banner with new one
        event.bannerUrl = await this.driveService.replaceFile(banner, uploadConfig, event.bannerUrl)
      } catch (error) {
        throw new BadRequestException(`Failed to upload banner image: ${error.message}`)
      }
    }

    // Handle artist associations update if provided
    if (data.artistIds !== undefined) {
      // Remove existing artist associations
      await EventArtist.query().where('eventId', event.id).delete()

      // Create new artist associations if any
      if (data.artistIds.length > 0) {
        const eventArtistData = data.artistIds.map((artistId) => ({
          eventId: event.id,
          artistId: artistId,
        }))
        await EventArtist.createMany(eventArtistData)
      }
    }

    await event.save()
    return event
  }

  /**
   * Deletes an event by ID and its associated banner image.
   * @param id - The event ID.
   * @return A promise that resolves to true if deleted, false if not found.
   */
  async delete(id: number): Promise<boolean> {
    const event = await Event.find(id)
    if (!event) {
      return false
    }

    // Delete the banner image file if it exists
    const uploadConfig = {
      uploadsPath: this.UPLOADS_PATH,
      allowedExtensions: this.ALLOWED_BANNER_EXTENSIONS,
      urlPrefix: this.UPLOADS_URL_PREFIX,
      entityType: 'event',
      entityId: id,
    }
    await this.driveService.deleteFile(event.bannerUrl, uploadConfig, id)

    await event.delete()
    return true
  }
}
