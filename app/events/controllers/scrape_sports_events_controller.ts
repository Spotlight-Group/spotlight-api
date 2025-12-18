import { HttpContext } from '@adonisjs/core/http'
import { SportsScraperService } from '#events/services/sports_scraper_service'
import { inject } from '@adonisjs/core'

@inject()
export default class ScrapeSportsEventsController {
    constructor(protected sportsScraperService: SportsScraperService) { }

    /**
     * @scrapeSportsEvents
     * @summary Scrape sports events for Toulouse teams
     * @description Fetch events from SportScore1 API for Toulouse teams and save them.
     * @tag Events
     * @responseBody 200 - {"message": "Sports events scraping started successfully"}
     * @responseBody 500 - {"message": "An error occurred", "error": "string"}
     */
    async handle({ response }: HttpContext): Promise<void> {
        try {
            console.log('Starting sports event scraping process...')

            // Fire and forget - or await if fast enough. 
            // The previous scraper awaited, so we will too for simplicity, though scraping can take time.
            await this.sportsScraperService.fetchAndSaveSportsEvents()

            return response.ok({
                message: 'Sports events scraped and saved successfully',
            })
        } catch (error) {
            console.error('Error during sports scraping:', error)

            return response.internalServerError({
                message: 'An error occurred while scraping sports events',
                error: error.message || 'Unknown error',
            })
        }
    }
}
