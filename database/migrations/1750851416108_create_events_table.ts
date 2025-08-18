import { BaseSchema } from '@adonisjs/lucid/schema'
import { EventType, EventSubtype } from '#events/enums/events'

export default class extends BaseSchema {
  protected tableName = 'events'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('title').notNullable()
      table.text('description').nullable()
      table.string('banner_url').nullable()
      table.date('start_date').notNullable()
      table.date('end_date').nullable()
      table.dateTime('start_hour').notNullable()
      table.dateTime('open_hour').nullable()
      table.double('latitude', 10, 8).notNullable()
      table.double('longitude', 11, 8).notNullable()
      table.string('place_name').notNullable()
      table.string('address').notNullable()
      table.string('city').notNullable()

      table.enu('type', Object.values(EventType)).notNullable()
      table.enu('subtype', Object.values(EventSubtype)).notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      // Helpful indexes for filtering
      table.index(['start_date'])
      table.index(['city'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
