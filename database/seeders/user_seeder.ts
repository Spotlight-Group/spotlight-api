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
      { title: 'Le Petit Bikini', city: 'Toulouse' },
      {
        title: 'Le Petit Bikini',
        description:
          'Apéro Disco\n' +
          '\n' +
          'mix by Madame Gaultier\n' +
          '\n' +
          '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n' +
          '\n' +
          'Piscine - Food - Cocktails - Jeux - Animations - Guinguette - …\n' +
          '\n' +
          'Réservations pour le bistro :\n' +
          '\n' +
          '05 62 24 09 50 // resa@lebikini.com\n' +
          '\n' +
          'Baignade autorisée\n' +
          '\n' +
          'Entrée libre dans la limite des places disponibles\n',
        bannerUrl:
          'https://lebikini.com/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Frf3cqo3h%2Fproduction%2F412ea9eae3a70a826c2524be9aa3fd8fd28b1974-1321x900.png%3Frect%3D1%2C0%2C1320%2C900%26w%3D1000%26h%3D682%26q%3D80%26dpr%3D2&w=750&q=80',
        startDate: day,
        endDate: day,
        startHour: day.set({ hour: 20, minute: 0, second: 0, millisecond: 0 }),
        openHour: day.set({ hour: 18, minute: 0, second: 0, millisecond: 0 }),
        latitude: 43.5615,
        longitude: 1.4857,
        placeName: 'Le Bikini',
        address: 'Rue Théodore Monod',
        city: 'Toulouse',
        type: EventType.CONCERT,
        subtype: EventSubtype.HIPHOP,
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
