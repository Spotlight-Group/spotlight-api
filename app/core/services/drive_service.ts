import { MultipartFile } from '@adonisjs/core/bodyparser'
import app from '@adonisjs/core/services/app'
import { cuid } from '@adonisjs/core/helpers'
import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { inject } from '@adonisjs/core'
import BadRequestException from '#exceptions/bad_request_exception'

export interface UploadConfig {
  uploadsPath: string
  allowedExtensions: string[]
  urlPrefix?: string
  entityType: string
  entityId: number
}

@inject()
export class DriveService {
  /**
   * Validates that the uploaded file has an allowed extension
   * @param file - The file to validate
   * @param allowedExtensions - Array of allowed file extensions
   * @throws Error if a file type is not allowed
   */
  validateFileType(file: MultipartFile, allowedExtensions: string[]): void {
    if (!allowedExtensions.includes(file.extname || '')) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`
      )
    }
  }

  /**
   * Uploads a file and returns the URL path
   * @param file - The file to upload
   * @param config - Upload configuration
   * @returns The URL path to the uploaded file
   */
  async uploadFile(file: MultipartFile, config: UploadConfig): Promise<string> {
    this.validateFileType(file, config.allowedExtensions)

    const fileName = `${config.entityType}_${config.entityId}_${cuid()}.${file.extname}`
    const uploadsPath = app.publicPath(config.uploadsPath)

    await file.move(uploadsPath, {
      name: fileName,
      overwrite: true,
    })

    // Return URL path based on configuration
    if (config.urlPrefix) {
      return `${config.urlPrefix}${fileName}`
    } else {
      return `/${config.uploadsPath}/${fileName}`
    }
  }

  /**
   * Deletes a file if it exists
   * @param filePath - The file path to delete (URL path)
   * @param config - Upload configuration for path resolution
   * @param entityId - Entity ID for logging purposes
   */
  async deleteFile(
    filePath: string | null | undefined,
    config: UploadConfig,
    entityId: number
  ): Promise<void> {
    if (!filePath) return

    const pathPrefix = config.urlPrefix || `/${config.uploadsPath}/`

    if (filePath.startsWith(pathPrefix)) {
      try {
        const fileName = filePath.replace(pathPrefix, '')
        const fullPath = join(app.publicPath(config.uploadsPath), fileName)
        await unlink(fullPath)
      } catch (error) {
        // Log the error but don't fail the operation if a file doesn't exist
        console.warn(
          `Failed to delete ${config.entityType} file for ${config.entityType} ${entityId}:`,
          error.message
        )
      }
    }
  }

  /**
   * Handles the complete file upload process including validation and old file deletion
   * @param file - The file to upload
   * @param config - Upload configuration
   * @param oldFilePath - Path to the old file to delete (optional)
   * @returns The URL path to the uploaded file
   */
  async replaceFile(
    file: MultipartFile,
    config: UploadConfig,
    oldFilePath?: string | null
  ): Promise<string> {
    // Delete an old file first
    if (oldFilePath) {
      await this.deleteFile(oldFilePath, config, config.entityId)
    }

    // Upload a new file
    return await this.uploadFile(file, config)
  }
}
