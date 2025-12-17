/**
 * Data Transfer Objects for Bookmarks
 */

export interface CreateBookmarkDto {
  eventId: number
}

export interface BookmarkResponseDto {
  userId: number
  eventId: number
  isFavorite: boolean
  hasJoined: boolean
  createdAt: string
  updatedAt: string | null
}

export interface BookmarkStatsDto {
  totalBookmarks: number
}
