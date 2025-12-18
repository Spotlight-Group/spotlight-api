import { inject } from '@adonisjs/core'
import env from '#start/env'
import { EventsService } from '#events/services/events_service'
import { AiService } from '#services/ai_service'
import { EventType, EventSubtype } from '#events/enums/events'
import { DateTime } from 'luxon'

@inject()
export class SportsScraperService {
    private rapidApiKey: string
    private baseUrl = 'https://sportscore1.p.rapidapi.com'

    // Mapping of sport slug to ID
    private sportsMap = {
        football: 1,
        basketball: 3,
        volleyball: 5,
        handball: 6,
        // rugby: ??? Not supported by SportScore1/RapidAPI based on /sports endpoint
    }

    // Keywords to identify Toulouse HOME games
    private toulouseTeamsKeywords = [
        'Toulouse',
        'Toulouse FC',
        'Fenix Toulouse',
        'Spacer\'s Toulouse',
        'Toulouse Métropole',
        'Stade Toulousain', // Included just in case Rugby appears in other sports or user changes API
    ]

    constructor(
        private eventsService: EventsService,
        private aiService: AiService
    ) {
        this.rapidApiKey = env.get('RAPID_API_KEY') || process.env['X-RapidAPI-Key'] || ''
        if (!this.rapidApiKey) {
            console.warn('[SportsScraper] No API Key found. Please set RAPID_API_KEY or X-RapidAPI-Key in .env')
        }
    }

    private async fetchFromApi(endpoint: string, params: Record<string, string> = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`)
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]))

        // Basic rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': this.rapidApiKey,
                'X-RapidAPI-Host': 'sportscore1.p.rapidapi.com',
            },
        })

        if (!response.ok) {
            if (response.status === 429) {
                console.warn(`[SportsScraper] Rate limit hit for ${endpoint}. Waiting 2s...`)
                await new Promise(resolve => setTimeout(resolve, 2000))
                return this.fetchFromApi(endpoint, params)
            }
            throw new Error(`RapidAPI Error: ${response.status} ${response.statusText}`)
        }

        return await response.json()
    }

    async fetchAndSaveSportsEvents() {
        console.log('[SportsScraper] Starting date-based scraping...')
        const today = DateTime.now()
        const daysToCheck = 21 // 3 weeks

        for (const [sportName, sportId] of Object.entries(this.sportsMap)) {
            console.log(`[SportsScraper] Checking sport: ${sportName} (ID: ${sportId})`)

            for (let i = 0; i < daysToCheck; i++) {
                const checkDate = today.plus({ days: i })
                const dateStr = checkDate.toFormat('yyyy-MM-dd')

                try {
                    const response = await this.fetchFromApi(`/sports/${sportId}/events/date/${dateStr}`)
                    const events = response.data || []

                    if (events.length === 0) continue

                    const toulouseEvents = events.filter((e: any) => {
                        const name = e.name || ''
                        // Check if name is exactly "Toulouse vs X" (implies Home)
                        // Or "Fenix Toulouse vs X" using startsWith
                        return this.toulouseTeamsKeywords.some(keyword => name.startsWith(keyword))
                    })

                    for (const event of toulouseEvents) {
                        console.log(`[SportsScraper] Found match: ${event.name} on ${dateStr}`)
                        await this.processEvent(event, sportName, checkDate)
                    }

                } catch (err) {
                    console.warn(`[SportsScraper] Failed to fetch events for ${sportName} on ${dateStr}:`, err)
                }
            }
        }
        console.log('[SportsScraper] Finished.')
    }

    private async processEvent(event: any, sportName: string, date: DateTime) {
        try {
            const nameParts = (event.name || '').split(/–|-/).map((s: string) => s.trim())
            if (nameParts.length < 2) return

            const homeName = nameParts[0]
            const awayName = nameParts[1]

            const title = `${homeName} vs ${awayName}`

            const description = `Match de ${sportName} opposant ${homeName} à ${awayName}. 
        Le match aura lieu le ${date.toFormat('dd/MM/yyyy')} à ${event.start_at ? DateTime.fromISO(event.start_at).toFormat('HH:mm') : 'l\'heure indiquée'}. 
        Venez supporter votre équipe au stade !`

            let subtype = EventSubtype.FOOTBALL
            if (sportName === 'basketball') subtype = EventSubtype.BASKETBALL
            if (sportName === 'volleyball') subtype = EventSubtype.VOLLEYBALL
            if (sportName === 'handball') subtype = EventSubtype.HANDBALL

            let startDate = date.toJSDate()
            if (event.start_at) { // Timestamp? Check API. explore_api said timestamp or ISO?
                // sample: "start_at": "2023-..." or timestamp number. 
                // "start_at" in sample was absent, "time_details" present.
                // Wait, sample said "period1StartTimestamp".
                // Let's assume start_at might not be there. Use date.
            }

            const homeLogo = event.home_team?.logo || ''
            const awayLogo = event.away_team?.logo || ''
            // Use placeholder if no logo, or just empty string. 
            // User asked for "comma separated". 
            // If one is missing, we might want a placeholder or just keep it empty? 
            // Let's assume we want valid URLs if possible.
            // If both missing, maybe fallback to sport? No, user said "enlève les images par sport".

            const bannerUrl = `${homeLogo},${awayLogo}`.replace(/^,|,$/g, '') // Clean up leading/trailing comma if one missing

            await this.eventsService.createFromUrl({
                title: title,
                description: description,
                startDate: startDate,
                endDate: DateTime.fromJSDate(startDate).plus({ hours: 2 }).toJSDate(),
                startHour: startDate,
                openHour: null,
                placeName: 'Stadium / Arena',
                address: 'Toulouse',
                city: 'Toulouse',
                type: EventType.EXHIBITION,
                subtype: subtype,
                bannerUrl: bannerUrl || null, // Ensure null if empty
                latitude: 43.6047,
                longitude: 1.4442,
            })
            console.log(`[SportsScraper] Saved: ${title}`)
        } catch (error: any) {
            // Ignore duplicate entry errors
            if (error.code === 'ER_DUP_ENTRY' || error.message.includes('Duplicate')) {
                console.log(`[SportsScraper] Skipped duplicate: ${event.name}`)
            } else {
                console.error(`[SportsScraper] Error saving event ${event.id}:`, error)
            }
        }
    }
}
