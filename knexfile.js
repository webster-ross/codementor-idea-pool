module.exports = {
  client: 'pg',
  connection: process.env.PG_URI || 'postgresql://postgres:@localhost:5432/idea-pool'
}
