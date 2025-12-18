import { inject } from '@adonisjs/core'
import env from '#start/env'
import { EventsService } from '#events/services/events_service'
import { AiService } from '#services/ai_service'
import { EventType, EventSubtype } from '#events/enums/events'
import { DateTime } from 'luxon'

interface Team {
    id: number
    name: string
    logo?: string
}

interface SportEvent {
    id: number
    name: string
    start_at?: string
    venue_id: number | null
    home_team?: Team
    away_team?: Team
}

interface VenueResponse {
    data: {
        id: number
        stadium?: { en: string } | string
        city?: { en: string } | string
    }
}

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
    }

    // Keywords to identify Toulouse HOME games
    private toulouseTeamsKeywords = [
        'Toulouse',
        'Toulouse FC',
        'Fenix Toulouse',
        'Spacer\'s Toulouse',
        'Toulouse Métropole',
        'Stade Toulousain',
    ]

    // Hardcoded coords for known main stadiums to ensure quality data
    private knownVenues: Record<string, { lat: number; lng: number }> = {
        'Stadium municipal': { lat: 43.5833, lng: 1.4342 },
        'Stadium de Toulouse': { lat: 43.5833, lng: 1.4340 },
        'Stade Ernest-Wallon': { lat: 43.6208, lng: 1.4162 }, // Rugby mainly but maybe used for others?
        'Palais des Sports André Brouat': { lat: 43.6125, lng: 1.4334 },
        'Palais des Sports': { lat: 43.6125, lng: 1.4334 },
        'Petit Palais des Sports': { lat: 43.6125, lng: 1.4334 },
    }

    constructor(
        private eventsService: EventsService,
        private aiService: AiService
    ) {
        this.rapidApiKey = env.get('RAPID_API_KEY') || process.env['X-RapidAPI-Key'] || ''
        if (!this.rapidApiKey) {
            console.warn('[SportsScraper] No API Key found. Please set RAPID_API_KEY or X-RapidAPI-Key in .env')
        }
    }

    private async fetchFromApi<T = any>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
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
                return this.fetchFromApi<T>(endpoint, params)
            }
            throw new Error(`RapidAPI Error: ${response.status} ${response.statusText}`)
        }

        return await response.json() as T
    }

    private async getVenueDetails(venueId: number): Promise<{ name: string } | null> {
        try {
            const data = await this.fetchFromApi<VenueResponse>(`/venues/${venueId}`)
            if (data && data.data) {
                let name = 'Stadium'
                if (typeof data.data.stadium === 'object' && data.data.stadium?.en) {
                    name = data.data.stadium.en
                } else if (typeof data.data.stadium === 'string') {
                    name = data.data.stadium
                }
                return { name }
            }
            return null
        } catch (error) {
            console.warn(`[SportsScraper] Failed to fetch venue ${venueId}`, error)
            return null
        }
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
                    const response = await this.fetchFromApi<{ data: SportEvent[] }>(`/sports/${sportId}/events/date/${dateStr}`)
                    const events = response.data || []

                    if (events.length === 0) continue

                    const toulouseEvents = events.filter((e) => {
                        const name = e.name || ''
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

    private async processEvent(event: SportEvent, sportName: string, date: DateTime) {
        try {
            const nameParts = (event.name || '').split(/–|-/).map((s: string) => s.trim())
            if (nameParts.length < 2) return

            const homeName = nameParts[0]
            const awayName = nameParts[1]
            const title = `${homeName} vs ${awayName}`

            // 1. Resolve Venue
            let placeName = 'Stadium / Arena'

            // Try API first
            if (event.venue_id) {
                const venueDetails = await this.getVenueDetails(event.venue_id)
                if (venueDetails && venueDetails.name) {
                    placeName = venueDetails.name
                }
            }

            // Fallback / Override based on Team if venue is generic or missing
            if (placeName === 'Stadium / Arena' || !event.venue_id) {
                if (sportName === 'football' && (homeName.includes('Toulouse') || homeName.includes('TFC'))) {
                    placeName = 'Stadium de Toulouse'
                } else if (homeName.includes('Fenix') || homeName.includes('Spacer')) {
                    placeName = 'Palais des Sports André Brouat'
                } else if (homeName.includes('Toulouse Métropole') || homeName.includes('Stade Toulousain')) {
                    // Check specific simple names
                    placeName = 'Petit Palais des Sports'
                }
            }

            // Resolve Coords from placeName
            let lat = 43.6047
            let lng = 1.4442

            // Normalize for lookup
            const lookupName = placeName.toLowerCase()
            const bestMatchEntry = Object.entries(this.knownVenues).find(([key]) => {
                return lookupName.includes(key.toLowerCase()) || key.toLowerCase().includes(lookupName)
            })

            if (bestMatchEntry) {
                lat = bestMatchEntry[1].lat
                lng = bestMatchEntry[1].lng
                // Use the nice formatted name from our list if we matched it, unless API gave a specific one we want to keep?
                // Actually our formatting is likely better if it matched.
                // But if API gave "Stade Municipal", and we matched "Stade", we might want API's.
                // But for "Stadium de Toulouse", let's use ours.
                // Let's stick to the detected placeName unless it was generic.
                if (placeName === 'Stadium / Arena') {
                    placeName = bestMatchEntry[0]
                }
            }

            // 2. Prepare Description
            const description = `Match de ${sportName} opposant ${homeName} à ${awayName}. 
        Le match aura lieu le ${date.toFormat('dd/MM/yyyy')} à ${event.start_at ? DateTime.fromISO(event.start_at).toFormat('HH:mm') : 'l\'heure indiquée'}. 
        Au ${placeName}. Venez supporter votre équipe !`

            // 3. Subtype
            let subtype = EventSubtype.FOOTBALL
            if (sportName === 'basketball') subtype = EventSubtype.BASKETBALL
            if (sportName === 'volleyball') subtype = EventSubtype.VOLLEYBALL
            if (sportName === 'handball') subtype = EventSubtype.HANDBALL

            // 4. Dates
            let startDate = date.toJSDate()
            let startHour = date.toJSDate()
            if (event.start_at) {
                const dt = DateTime.fromISO(event.start_at)
                if (dt.isValid) {
                    // Updating date to match API if valid
                    startDate = dt.toJSDate()
                    startHour = dt.toJSDate()
                }
            }

            // 5. Banner
            const homeLogo = event.home_team?.logo || ''
            const awayLogo = event.away_team?.logo || ''
            const bannerUrl = `${homeLogo},${awayLogo}`.replace(/^,|,$/g, '')

            await this.eventsService.createFromUrl({
                title: title,
                description: description,
                startDate: startDate,
                endDate: DateTime.fromJSDate(startDate).plus({ hours: 2 }).toJSDate(),
                startHour: startHour,
                openHour: null,
                placeName: placeName,
                address: 'Toulouse',
                city: 'Toulouse',
                type: EventType.EXHIBITION,
                subtype: subtype,
                bannerUrl: bannerUrl || null,
                latitude: lat,
                longitude: lng,
            })
            console.log(`[SportsScraper] Saved: ${title} @ ${placeName}`)
        } catch (error: any) {
            if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('Duplicate')) {
                console.log(`[SportsScraper] Skipped duplicate: ${event.name}`)
            } else {
                console.error(`[SportsScraper] Error saving event ${event.id}:`, error)
            }
        }
    }
}
