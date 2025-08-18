import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#auth/models/user'
import { UserRoles } from '#auth/enums/users'
import Event from '#events/models/event'
import EventUser from '#events/models/event_user'
import { EventType, EventSubtype } from '#events/enums/events'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    // Create admin user
    const admin = await User.updateOrCreate(
      { email: 'admin@spotlight.com' },
      {
        full_name: 'Admin User',
        email: 'admin@spotlight.com',
        password: 'admin123',
        role: UserRoles.ADMIN,
      }
    )

    // Create regular user
    const regular = await User.updateOrCreate(
      { email: 'user@spotlight.com' },
      {
        full_name: 'Regular User',
        email: 'user@spotlight.com',
        password: 'user123',
        role: UserRoles.USER,
      }
    )

    // Compute tomorrow's date
    const tomorrow = DateTime.local().plus({ days: 1 })
    const day = tomorrow.startOf('day')

    // Create or update the example event for "tomorrow"
    const gig = await Event.updateOrCreate(
      { title: 'Live @ Bikini', city: 'Toulouse' },
      {
        title: 'Live @ Bikini',
        description: 'Showcase au Bikini',
        bannerUrl: null,
        startDate: day,
        endDate: day,
        startHour: day.set({ hour: 20, minute: 0, second: 0, millisecond: 0 }),
        openHour: null,
        latitude: 43.5615,
        longitude: 1.4857,
        placeName: 'Le Bikini',
        address: 'Rue Théodore Monod',
        city: 'Toulouse',
        type: EventType.CONCERT,
        subtype: EventSubtype.ROCK,
      }
    )

    // Participations + favorites via pivot (idempotent)
    await EventUser.updateOrCreate(
      { userId: admin.id, eventId: gig.id },
      { isFavorite: true, hasJoined: false }
    )

    await EventUser.updateOrCreate(
      { userId: regular.id, eventId: gig.id },
      { isFavorite: true, hasJoined: true }
    )

    console.log('✅ Users, event and participations seeded successfully')
  }
}
