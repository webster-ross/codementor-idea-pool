export default {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '3000',
  JWT_SECRET: process.env.JWT_SECRET || 'secret',
  REDIS_URL: process.env.REDIS_URL,
  PG_URI: process.env.PG_URI || 'postgresql://postgres:@localhost:5432/idea-pool'
}
