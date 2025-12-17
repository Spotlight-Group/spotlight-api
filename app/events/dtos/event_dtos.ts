/**
 * Data Transfer Objects for Events
 */

export interface CreateEventDto {
  title: string
  description?: string
  startDate: Date
  endDate?: Date
  startHour: Date
  openHour?: Date
  latitude: number
  longitude: number
  placeName: string
  address: string
  city: string
  type: string
  subtype: string
  artistIds?: number[]
}

export interface UpdateEventDto {
  title?: string
  description?: string
  startDate?: Date
  endDate?: Date
  startHour?: Date
  openHour?: Date
  latitude?: number
  longitude?: number
  placeName?: string
  address?: string
  city?: string
  type?: string
  subtype?: string
  artistIds?: number[]
}

export interface EventResponseDto {
  id: number
  title: string
  description: string | null
  bannerUrl: string | null
  startDate: string
  endDate: string | null
  startHour: string
  openHour: string | null
  latitude: number
  longitude: number
  placeName: string
  address: string
  city: string
  type: string
  subtype: string
  createdAt: string
  updatedAt: string | null
  artists?: ArtistResponseDto[]
}

export interface ArtistResponseDto {
  id: number
  name: string
  image: string
}

export interface GetEventsQueryDto {
  page?: number
  limit?: number
  type?: string
  subtype?: string
  city?: string
  startDate?: Date
  endDate?: Date
}
