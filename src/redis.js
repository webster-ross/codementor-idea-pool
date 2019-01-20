import redis from 'async-redis'
import configs from './configs'

export default () => {
  const client = redis.createClient(configs.REDIS_URL)
  if(process.env.NODE_ENV == 'test') client.select(1)
  return client
}
