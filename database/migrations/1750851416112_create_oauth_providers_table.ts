import { BaseSchema } from '@adonisjs/lucid/schema'
import { OAuthProviders } from '#auth/enums/oauth_providers'

export default class extends BaseSchema {
  protected tableName = 'oauth_providers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.enu('provider_name', Object.values(OAuthProviders)).notNullable()
      table.string('provider_id').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      // Ensure unique combination of user_id and provider_name
      table.unique(['user_id', 'provider_name'])
      // Ensure unique combination of provider_name and provider_id
      table.unique(['provider_name', 'provider_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
