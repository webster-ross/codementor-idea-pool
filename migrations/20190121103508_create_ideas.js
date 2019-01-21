exports.up = async knex => {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
  await knex.schema.createTable('ideas', table => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary()
    table.text('content').notNull()
    table.integer('impact').notNull()
    table.integer('ease').notNull()
    table.integer('confidence').notNull()
    table.integer('user_id').notNull().references('users.id')
    table.timestamp('created_at').notNull().defaultTo(knex.fn.now())
  })
}

exports.down = async knex => {
  await knex.schema.dropTableIfExists('ideas')
}
