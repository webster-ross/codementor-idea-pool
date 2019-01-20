exports.up = async (knex) => {
  await knex.schema.createTable('users', table => {
    table.increments('id').unsigned().primary()
    table.text('email').notNull().unique()
    table.text('name').notNull()
    table.text('password').notNull()
  })
}

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('users')
}
