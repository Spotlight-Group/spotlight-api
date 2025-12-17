import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'event_users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('user_id').unsigned().notNullable()
      table.integer('event_id').unsigned().notNullable()
      table.boolean('is_favorite').defaultTo(false).notNullable()
      table.boolean('has_joined').defaultTo(false).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      // Prevent duplicate participation per (user, event)
      table.unique(['user_id', 'event_id'])

      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')

      table.foreign('event_id').references('id').inTable('events').onDelete('CASCADE')

      // Speed up listing by event and creation date
      table.index(['event_id', 'created_at'])
      // Speed up queries by user (favorites/joined per user)
      table.index(['user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
