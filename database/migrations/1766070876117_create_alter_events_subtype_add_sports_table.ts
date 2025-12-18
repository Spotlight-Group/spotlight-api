import { BaseSchema } from '@adonisjs/lucid/schema'
import { EventSubtype } from '#events/enums/events'

export default class extends BaseSchema {
  protected tableName = 'events'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Re-define the enum with ALL current values from the TS Enum
      table.enu('subtype', Object.values(EventSubtype)).notNullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Revert to original list if needed, or simply leave it as is since strict revert is hard without hardcoding old values.
      // For safety, we can list the original values known at this time (concert types only).
      const oldSubtypes = ['rock', 'hiphop', 'jazz', 'techno', 'classical']
      table.enu('subtype', oldSubtypes).notNullable().alter()
    })
  }
}