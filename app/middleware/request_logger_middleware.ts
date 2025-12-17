import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import logger from '@adonisjs/core/services/logger'

/**
 * Request logging middleware
 * Logs all HTTP requests with method, URL, status code, and response time
 */
export default class RequestLoggerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const startTime = Date.now()
    const { method, url } = ctx.request

    // Log incoming request
    logger.info({
      event: 'http.request.incoming',
      method,
      url,
      ip: ctx.request.ip(),
      userAgent: ctx.request.header('user-agent'),
    })

    try {
      // Process request
      await next()
    } catch (error) {
      // Log error
      logger.error({
        event: 'http.request.error',
        method,
        url,
        error: error.message,
        duration: Date.now() - startTime,
      })
      throw error
    } finally {
      // Log completed request
      const duration = Date.now() - startTime
      const statusCode = ctx.response.getStatus()

      const logData = {
        event: 'http.request.completed',
        method,
        url,
        statusCode,
        duration,
      }

      // Log as warning for slow requests (> 1s)
      if (duration > 1000) {
        logger.warn({ ...logData, slow: true })
      } else if (statusCode >= 500) {
        logger.error(logData)
      } else if (statusCode >= 400) {
        logger.warn(logData)
      } else {
        logger.info(logData)
      }
    }
  }
}
