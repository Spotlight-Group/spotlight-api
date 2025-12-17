import puppeteer from 'puppeteer'
import { DateTime } from 'luxon'
import Event from '#events/models/event'
import { inject } from '@adonisjs/core'
import { EventType, EventSubtype } from '#events/enums/events'
import { EventsService } from '#events/services/events_service'
import { ArtistsService } from '#artists/services/artists_service'
import db from '@adonisjs/lucid/services/db'

@inject()
export class EventsScraperService {
  constructor(
    private eventsService: EventsService,
    private artistsService: ArtistsService
  ) { }

  private async createOrFindArtists(lineup: { name: string; image: string }[]): Promise<number[]> {
    const artistIds: number[] = []

    for (const artistData of lineup) {
      try {
        const artist = await this.artistsService.createOrFindFromUrl({
          name: artistData.name,
          imageUrl: artistData.image,
        })
        artistIds.push(artist.id)
      } catch (error) {
        console.warn(`Failed to create/find artist ${artistData.name}:`, error)
      }
    }

    return artistIds
  }

  private buildISODate(day: string, monthStr: string, hour: string): string {
    const year = new Date().getFullYear()
    const monthsMap: Record<string, number> = {
      janv: 1,
      févr: 2,
      mars: 3,
      avr: 4,
      mai: 5,
      juin: 6,
      juil: 7,
      août: 8,
      sept: 9,
      oct: 10,
      nov: 11,
      déc: 12,
    }
    const monthNum = monthsMap[monthStr.toLowerCase()]
    if (!monthNum) throw new Error(`Mois inconnu: ${monthStr}`)

    const dayPadded = day.padStart(2, '0')
    const monthPadded = monthNum.toString().padStart(2, '0')
    const isoDate = `${year}-${monthPadded}-${dayPadded}T${hour}:00`

    console.log('buildISODate =>', isoDate)
    return isoDate
  }

  private async createEventFromScrapedData(eventData: {
    title: string
    startDate: string
    endDate: string
    address: string
    city: string
    placeName: string
    latitude: number | null
    longitude: number | null
    bannerUrl: string
    description: string
    lineup: { name: string; image: string }[]
  }): Promise<Event> {
    const artistIds = await this.createOrFindArtists(eventData.lineup)

    const startDateTime = DateTime.fromISO(eventData.startDate)
    const endDateTime = DateTime.fromISO(eventData.endDate)

    if (!startDateTime.isValid) {
      throw new Error(`Date de début invalide : ${eventData.startDate}`)
    }
    if (!endDateTime.isValid) {
      throw new Error(`Date de fin invalide : ${eventData.endDate}`)
    }

    const event = await this.eventsService.createFromUrl({
      title: eventData.title,
      description: eventData.description || null,
      startDate: startDateTime.toJSDate(),
      endDate: endDateTime.toJSDate(),
      startHour: startDateTime.toJSDate(),
      openHour: null,
      latitude: eventData.latitude || 0,
      longitude: eventData.longitude || 0,
      placeName: eventData.placeName,
      address: eventData.address,
      city: eventData.city,
      type: EventType.CONCERT,
      subtype: EventSubtype.ROCK,
      bannerUrl: eventData.bannerUrl,
      artistIds: artistIds.length > 0 ? artistIds : undefined,
    })

    return event
  }

  private cleanAddress(address: string): string {
    const parts = address.split(',').map((p) => p.trim())
    if (parts.length > 1) {
      const firstPart = parts[0]
      const hasDigits = /\d/.test(firstPart)
      const streetTypes = [
        'rue',
        'avenue',
        'place',
        'boulevard',
        'allée',
        'impasse',
        'quai',
        'chemin',
        'route',
      ]
      const startsWithStreetType = streetTypes.some((t) => firstPart.toLowerCase().startsWith(t))

      if (!hasDigits && !startsWithStreetType) {
        return parts.slice(1).join(', ')
      }
    }
    return address
  }

  private async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    // Basic Rate Limiting
    await new Promise((resolve) => setTimeout(resolve, 1000))

    try {
      let query = address
      let response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
        {
          headers: {
            'User-Agent': 'SpotlightApp/1.0 (contact@spotlight.app)',
          },
        }
      )

      if (!response.ok) {
        console.warn(`Geocoding failed for ${query}: ${response.status} ${response.statusText}`)
        return null
      }

      let data = (await response.json()) as { lat: string; lon: string }[]

      // Retry with cleaned address if no results
      if (!data || data.length === 0) {
        const cleaned = this.cleanAddress(address)
        if (cleaned !== address) {
          // Rate limit for retry too
          await new Promise((resolve) => setTimeout(resolve, 1000))

          response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleaned)}`,
            {
              headers: {
                'User-Agent': 'SpotlightApp/1.0 (contact@spotlight.app)',
              },
            }
          )

          if (response.ok) {
            data = (await response.json()) as { lat: string; lon: string }[]
          }
        }
      }

      if (data && data.length > 0) {
        return {
          lat: Number.parseFloat(data[0].lat),
          lng: Number.parseFloat(data[0].lon),
        }
      }

      return null
    } catch (error) {
      console.warn('Erreur lors du géocodage :', error)
      return null
    }
  }

  async fetchShotgunEvents(): Promise<Event[]> {
    // Clear existing events & artists
    await db.from('events').delete()
    await db.from('artists').delete()

    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    await page.goto('https://shotgun.live/fr/cities/toulouse', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    while (true) {
      const loadMoreVisible = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) =>
          b.textContent?.toLowerCase().includes('voir plus')
        )
        if (btn) {
          ; (btn as HTMLElement).click()
          return true
        }
        return false
      })
      if (!loadMoreVisible) break
      await wait(2500)
    }

    await wait(2000)

    const rawEvents = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[data-slot="tracked-link"]'))
      return anchors
        .map((a) => {
          const title = a.querySelector('p.line-clamp-2')?.textContent?.trim() || ''
          const location = a.querySelector('.text-muted-foreground')?.textContent?.trim() || ''
          const dateTag = a.querySelector('time')
          const dateIso = dateTag?.getAttribute('datetime') || ''
          const href = a.getAttribute('href') || ''
          const url = 'https://shotgun.live' + href
          const img = a.querySelector('img')?.getAttribute('src') || ''
          return { title, date: dateIso, location, url, image: img }
        })
        .filter((e) => e.title && e.date)
    })

    const now = new Date()
    const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())

    const inFourWeeks = new Date()
    inFourWeeks.setDate(inFourWeeks.getDate() + 28)
    const inFourWeeksUtc = Date.UTC(
      inFourWeeks.getUTCFullYear(),
      inFourWeeks.getUTCMonth(),
      inFourWeeks.getUTCDate()
    )

    const events = rawEvents.filter((event) => {
      const eventDate = new Date(event.date)
      const eventUtc = Date.UTC(
        eventDate.getUTCFullYear(),
        eventDate.getUTCMonth(),
        eventDate.getUTCDate()
      )
      return eventUtc >= nowUtc && eventUtc <= inFourWeeksUtc
    })

    const createdEvents: Event[] = []

    for (const event of events) {
      try {
        await page.goto(event.url, { waitUntil: 'domcontentloaded', timeout: 30000 })

        const { description, lineup, location, placeName, startDateTime } =
          await page.evaluate(() => {
            const result = {
              description: '',
              lineup: [] as { name: string; image: string }[],
              location: '',
              placeName: '',
              startDateTime: '',
              endDateTime: '',
            }

            const aboutHeader = Array.from(document.querySelectorAll('.text-2xl')).find(
              (h) => h.textContent?.trim() === 'À propos'
            )
            if (aboutHeader) {
              const parent = aboutHeader.closest('section') || aboutHeader.parentElement
              const descDiv = parent?.querySelector('div.whitespace-pre-wrap')
              if (descDiv) {
                result.description = descDiv.textContent?.trim() || ''
              }
            }

            const lineupContainer = document.querySelector('div.grid.grid-cols-3')
            if (lineupContainer) {
              const artistLinks = Array.from(
                lineupContainer.querySelectorAll('a[data-slot="tracked-link"]')
              )
              for (const a of artistLinks) {
                const nameDiv = a.querySelector('div.text-muted-foreground')
                const name = nameDiv?.textContent?.trim() || ''
                const img = a.querySelector('img')?.getAttribute('src') || ''
                if (name && img && !name.includes('abonné')) {
                  result.lineup.push({ name, image: img })
                }
              }
            }

            const locationAnchor = Array.from(document.querySelectorAll('a.text-foreground'))
              .find((a): a is HTMLAnchorElement => a instanceof HTMLAnchorElement && a.href.includes('google.com/maps/search'))

            if (locationAnchor) {
              result.location = locationAnchor.textContent?.trim() || ''
            }

            const placeNameAnchor = Array.from(
              document.querySelectorAll('div.flex.items-center.gap-4 a.text-foreground')
            ).find((a) => a.textContent?.trim()?.length && a.textContent?.trim()?.length < 100)
            if (placeNameAnchor) {
              result.placeName = placeNameAnchor.textContent?.trim() || ''
            }

            const dateSpan = Array.from(
              document.querySelectorAll('div.flex.items-center.gap-4 span')
            ).map((span) => span.textContent?.trim() || '')

            if (dateSpan.length >= 8) {
              const fullText = dateSpan.join(' ')
              const regex =
                /Du\s+\w+\s+(\d+)\s+(\w+)\.?\s+à\s+(\d{2}:\d{2})\s+Au\s+\w+\s+(\d+)\s+(\w+)\.?\s+à\s+(\d{2}:\d{2})/
              const match = fullText.match(regex)
              if (match) {
                const [_, startDay, startMonth, startHour, endDay, endMonth, endHour] = match
                result.startDateTime = `${new Date().getFullYear()}-${startMonth}-${startDay}T${startHour}:00`
                result.endDateTime = `${new Date().getFullYear()}-${endMonth}-${endDay}T${endHour}:00`
              }
            }

            return result
          })

        // Correction parsing des dates avec la fonction buildISODate
        let startDate = ''
        let endDate = ''
        try {
          if (startDateTime) {
            // On parse startDateTime avec regex
            const regex =
              /Du\s+\w+\s+(\d+)\s+(\w+)\.?\s+à\s+(\d{2}:\d{2})\s+Au\s+\w+\s+(\d+)\s+(\w+)\.?\s+à\s+(\d{2}:\d{2})/
            const match = startDateTime.match(regex)
            if (match) {
              const [, startDay, startMonth, startHour, endDay, endMonth, endHour] = match
              startDate = this.buildISODate(startDay, startMonth, startHour)
              endDate = this.buildISODate(endDay, endMonth, endHour)
            }
          }
        } catch (err) {
          console.warn('Erreur parsing dates:', err)
        }

        // fallback si pas de date valide
        if (!startDate) startDate = event.date
        if (!endDate) endDate = event.date

        const coords = location ? await this.geocodeAddress(location) : null

        const createdEvent = await this.createEventFromScrapedData({
          title: event.title,
          startDate,
          endDate,
          address: location,
          city: 'Toulouse',
          placeName: placeName || '',
          latitude: coords?.lat || null,
          longitude: coords?.lng || null,
          bannerUrl: event.image,
          description,
          lineup,
        })
        createdEvents.push(createdEvent)
      } catch (error) {
        console.warn("Erreur lors de la création d'événement:", error)
      }
    }

    await browser.close()

    return createdEvents
  }
}
