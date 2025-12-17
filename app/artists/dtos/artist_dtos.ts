/**
 * Data Transfer Objects for Artists
 */

export interface CreateArtistDto {
  name: string
}

export interface UpdateArtistDto {
  name?: string
}

export interface ArtistResponseDto {
  id: number
  name: string
  image: string
  createdAt: string
  updatedAt: string | null
}

export interface GetArtistsQueryDto {
  page?: number
  limit?: number
  name?: string
}
