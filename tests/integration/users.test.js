import request from 'supertest'
import Redis from '../../src/redis'
import pg from '../../src/postgres'
import titleCase from 'title-case'
import Server from '../../src/server'
import configs from '../../src/configs'
import {verifyHeaders} from '../utils'

const server = Server()

beforeAll(() => pg.connect())
//afterAll(() => pg.end())

describe('POST /users', () => {
  beforeEach(async () => {
    await pg.query('truncate users restart identity cascade')
  })

  it('returns valid response', async () => {
    const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
    const response = await request(server).post('/users').send(user)
    expect(response.status).toBe(201)
    verifyHeaders(response)
    expect(response.body.jwt).toBeTruthy()
    expect(response.body.refresh_token).toBeTruthy()
  })

  it('stores a refresh token', async () => {
    const redisClient = Redis()
    await redisClient.flushall()
    const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
    const response = await request(server).post('/users').send(user)
    const refreshToken = response.body.refresh_token
    const value = await redisClient.get(refreshToken)
    expect(value).toBe(''+1)
    redisClient.flushall()
  })

  it('returns valid jwt', async () => {
    const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
    let response = await request(server).post('/users').send(user)
    const {jwt} = response.body
    response = await request(server).get('/me').set('X-Access-Token', jwt)
    expect(response.body.email).toBe(user.email)
    expect(response.body.name).toBe(user.name)
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
      verifyHeaders(response)
      expect(response.body.msg).toBe('Bad Request')
      expect(response.body.errors).toBeTruthy()

      user = {email: 'email@test.com', password: 'Test1234'}
      response = await request(server).post('/users').send(user)
      expect(response.status).toBe(400)
      verifyHeaders(response)
      expect(response.body.msg).toBe('Bad Request')
      expect(response.body.errors).toBeTruthy()

      user = {email: 'email@test.com', name: 'Tester'}
      response = await request(server).post('/users').send(user)
      expect(response.status).toBe(400)
      verifyHeaders(response)
      expect(response.body.msg).toBe('Bad Request')
      expect(response.body.errors).toBeTruthy()
    })

    it('handles invalid email', async () => {
      let user = {email: 'em@il@test.com', name: 'Tester', password: 'Test1234'}
      let response = await request(server).post('/users').send(user)
      expect(response.status).toBe(400)
      verifyHeaders(response)
      expect(response.body.msg).toBe('Bad Request')
      expect(response.body.errors).toBeTruthy()

      user = {email: ' ', name: 'Tester', password: 'Test1234'}
      response = await request(server).post('/users').send(user)
      expect(response.status).toBe(400)
      verifyHeaders(response)
      expect(response.body.msg).toBe('Bad Request')
      expect(response.body.errors).toBeTruthy()
    })

    it('handles invalid name', async () => {
      let user = {email: 'email@test.com', name: ' ', password: 'Test1234'}
      let response = await request(server).post('/users').send(user)
      expect(response.status).toBe(400)
      verifyHeaders(response)
      expect(response.body.msg).toBe('Bad Request')
      expect(response.body.errors).toBeTruthy()

      user = {email: 'email@test.com', name: 'T', password: 'Test1234'}
      response = await request(server).post('/users').send(user)
      expect(response.status).toBe(400)
      verifyHeaders(response)
      expect(response.body.msg).toBe('Bad Request')
      expect(response.body.errors).toBeTruthy()
    })

    it('handles invalid password', async () => {
      let user = {email: 'email@test.com', name: 'Tester', password: ' '}
      let response = await request(server).post('/users').send(user)
      expect(response.status).toBe(400)
      verifyHeaders(response)
      expect(response.body.msg).toBe('Bad Request')
      expect(response.body.errors).toBeTruthy()

      user = {email: 'email@test.com', name: 'Tester', password: 'test'}
      response = await request(server).post('/users').send(user)
      expect(response.status).toBe(400)
      verifyHeaders(response)
      expect(response.body.msg).toBe('Bad Request')
      expect(response.body.errors).toBeTruthy()
    })

    it('prevents duplicate emails', async () => {
      let user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
      await request(server).post('/users').send(user)
      let response = await request(server).post('/users').send(user)
      expect(response.status).toBe(400)
      verifyHeaders(response)
      expect(response.body.msg).toBe('Bad Request')
      expect(response.body.errors).toBeTruthy()
    })
  })
})
