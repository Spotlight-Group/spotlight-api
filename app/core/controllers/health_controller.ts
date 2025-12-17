import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class HealthController {
  /**
   * @healthCheck
   * @summary Health check endpoint
   * @description Returns the health status of the API and its dependencies
   * @tag System
   * @responseBody 200 - {\"status\": \"ok\", \"timestamp\": \"2024-01-01T00:00:00.000Z\", \"uptime\": 123, \"database\": \"ok\"} - Health check successful
   * @responseBody 503 - {\"status\": \"error\", \"error\": \"Database connection failed\"} - Health check failed
   */
  async handle({ response }: HttpContext): Promise<void> {
    try {
      // Check database connection
      await db.rawQuery('SELECT 1')

      const healthData = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'ok',
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB',
        },
      }

      response.status(200).json(healthData)
    } catch (error) {
      response.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      })
    }
  }
}
