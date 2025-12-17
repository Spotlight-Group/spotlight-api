/**
 * Common pagination and response DTOs
 */

export interface PaginationMetaDto {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstPage: number
  firstPageUrl: string
  lastPageUrl: string
  nextPageUrl: string | null
  previousPageUrl: string | null
}

export interface PaginatedResponseDto<T> {
  data: T[]
  meta: PaginationMetaDto
}

export interface SuccessResponseDto<T> {
  message: string
  data: T
}

export interface ErrorResponseDto {
  message: string
  error?: string
  code?: string
}

export interface ValidationErrorResponseDto extends ErrorResponseDto {
  errors: any[]
}
