import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Input sanitization middleware
 * Sanitizes common XSS and injection patterns from request body and query parameters
 */
export default class SanitizeInputMiddleware {
  /**
   * Sanitize a string value by removing potentially dangerous characters
   */
  private sanitizeString(value: string): string {
    if (typeof value !== 'string') return value

    return (
      value
        // Remove script tags
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove event handlers
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        // Remove javascript: protocol
        .replace(/javascript:/gi, '')
        // Trim whitespace
        .trim()
    )
  }

  /**
   * Recursively sanitize an object
   */
  private sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) return obj
    if (typeof obj === 'string') return this.sanitizeString(obj)
    if (typeof obj !== 'object') return obj

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item))
    }

    const sanitized: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = this.sanitizeObject(obj[key])
      }
    }
    return sanitized
  }

  async handle(ctx: HttpContext, next: NextFn) {
    // Sanitize request body
    if (ctx.request.body()) {
      const sanitizedBody = this.sanitizeObject(ctx.request.body())
      ctx.request.updateBody(sanitizedBody)
    }

    // Sanitize query parameters
    if (ctx.request.qs()) {
      const sanitizedQs = this.sanitizeObject(ctx.request.qs())
      ctx.request.updateQs(sanitizedQs)
    }

    await next()
  }
}
