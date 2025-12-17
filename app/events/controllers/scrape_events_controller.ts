import { HttpContext } from '@adonisjs/core/http'
import { EventsScraperService } from '#events/services/events_scraper_service'
import { inject } from '@adonisjs/core'

@inject()
export default class ScrapeEventsController {
  constructor(protected eventsScraperService: EventsScraperService) {}

  /**
   * @scrapeEvents
   * @summary Scrape events from Shotgun
   * @description Scrape events from Shotgun website for Toulouse and save them to the database
   * @tag Events
   * @responseBody 200 - <Event[]> - Events scraped and saved successfully
   * @responseBody 500 - {"message": "An error occurred while scraping events", "error": "string"} - Internal server error
   */
  async handle({ response }: HttpContext): Promise<void> {
    try {
      console.log('Starting event scraping process...')

      const scrapedEvents = await this.eventsScraperService.fetchShotgunEvents()

      return response.ok({
        message: 'Events scraped and saved successfully',
        data: scrapedEvents,
        meta: {
          total: scrapedEvents.length,
          source: 'Shotgun Toulouse',
          scrapedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error('Error during event scraping:', error)

      // Handle specific scraping errors
      if (error.message?.includes('timeout') || error.message?.includes('navigation')) {
        return response.internalServerError({
          message: 'Scraping timeout or navigation error',
          error:
            'The scraping process timed out or encountered a navigation issue. Please try again later.',
        })
      }

      if (error.message?.includes('geocoding') || error.message?.includes('geocode')) {
        return response.internalServerError({
          message: 'Geocoding service error',
          error:
            'There was an issue with the geocoding service. Some events may not have location coordinates.',
        })
      }

      if (error.message?.includes('database') || error.message?.includes('create')) {
        return response.internalServerError({
          message: 'Database error during event creation',
          error:
            'There was an issue saving events to the database. Please check the database connection.',
        })
      }

      // Handle general errors
      return response.internalServerError({
        message: 'An error occurred while scraping events',
        error: error.message || 'Unknown error occurred during scraping process',
      })
    }
  }
}
