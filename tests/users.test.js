import request from 'supertest'
import port from 'get-port'
import redis from 'async-redis'
import {Client} from 'pg'
import titleCase from 'title-case'
import createServer from '../src/server'
import configs from '../src/configs'
import {verifyHeader} from './utils'

// start a server instance with a dynamic port
const server = createServer(async () => await port())
const pg = new Client({connectionString: configs.PG_URI})

beforeAll(() => pg.connect())
afterAll(() => {
  pg.end()
  server.close()
})

describe('POST /users', () => {
  beforeEach(async () => {
    await pg.query('truncate users restart identity cascade')
  })

  it('returns valid response', async () => {
    const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
    const response = await request(server).post('/users').send(user)
    expect(response.status).toBe(201)
    verifyHeader(response)
    expect(response.body.jwt).toBeTruthy()
    expect(response.body.refresh_token).toBeTruthy()
  })

  it('stores a refresh token', async () => {
    const redisClient = redis.createClient(configs.REDIS_URL)
    await redisClient.flushall()
    const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
    const response = await request(server).post('/users').send(user)
    const refreshToken = response.body.refresh_token
    const value = await redisClient.get(refreshToken)
    expect(value).toBe(''+1)
    redisClient.flushall()
  })

  it('creates a new user', async () => {
    const user = {email: ' Email@est.com ', name: ' tester tester ', password: 'Test1234'}
    const response = await request(server).post('/users').send(user)
    const {rows} = await pg.query(`select * from users where email = '${user.email.toLowerCase().trim()}'`)
    const {id, email, name, password} = rows[0]
    expect(email).toBe(user.email.toLowerCase().trim())
    expect(name).toBe(titleCase(user.name).trim())
    expect(password).toBeTruthy()
    expect(password).not.toBe(user.password.trim())
    expect(password).not.toBe(user.password)
    expect(id).toBe(1)
  })

  describe('invalid user input', () => {
    it('handles missing inputs', async () => {
      let user = {name: 'Tester', password: 'Test1234'}
      let response = await request(server).post('/users').send(user)
      expect(response.status).toBe(400)

      user = {email: 'email@test.com', password: 'Test1234'}
      response = await request(server).post('/users').send(user)
      expect(response.status).toBe(400)

      user = {email: 'email@test.com', name: 'Tester'}
      response = await request(server).post('/users').send(user)
      expect(response.status).toBe(400)
    })

    it('handles invalid email', async () => {
      let user = {email: 'em@il@test.com', name: 'Tester', password: 'Test1234'}
      let response = await request(server).post('/users').send(user)
      expect(response.status).toBe(400)

      user = {email: ' ', name: 'Tester', password: 'Test1234'}
      response = await request(server).post('/users').send(user)
      expect(response.status).toBe(400)
    })

    it('handles invalid name', async () => {
      let user = {email: 'email@test.com', name: ' ', password: 'Test1234'}
      let response = await request(server).post('/users').send(user)
      expect(response.status).toBe(400)

      user = {email: 'email@test.com', name: 'T', password: 'Test1234'}
      response = await request(server).post('/users').send(user)
      expect(response.status).toBe(400)
    })

    it('handles invalid password', async () => {
      let user = {email: 'email@test.com', name: 'Tester', password: ' '}
      let response = await request(server).post('/users').send(user)
      expect(response.status).toBe(400)

      user = {email: 'email@test.com', name: 'Tester', password: 'test'}
      response = await request(server).post('/users').send(user)
      expect(response.status).toBe(400)
    })

    it('prevents duplicate emails', async () => {
      let user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
      await request(server).post('/users').send(user)
      let response = await request(server).post('/users').send(user)
      expect(response.status).toBe(400)
    })
  })
})
