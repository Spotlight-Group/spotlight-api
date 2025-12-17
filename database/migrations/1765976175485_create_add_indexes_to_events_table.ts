import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'events'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Add index on type for filtering by event type
      table.index(['type'], 'events_type_index')

      // Composite indexes for common query patterns
      table.index(['type', 'city'], 'events_type_city_index')
      table.index(['type', 'start_date'], 'events_type_start_date_index')
      table.index(['city', 'start_date'], 'events_city_start_date_index')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['type'], 'events_type_index')
      table.dropIndex(['type', 'city'], 'events_type_city_index')
      table.dropIndex(['type', 'start_date'], 'events_type_start_date_index')
      table.dropIndex(['city', 'start_date'], 'events_city_start_date_index')
    })
  }
}
