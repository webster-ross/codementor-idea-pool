import request from 'supertest'
import pg from '../../src/postgres'
import Server from '../../src/server'
import Redis from '../../src/redis'
import {verifyHeaders} from '../utils'

const server = Server()

beforeAll(() => pg.connect())
//afterAll(() => pg.end())

describe('POST /access-tokens/refresh', () => {
  beforeEach(async () => {
    await pg.query('truncate users restart identity cascade')
  })

  it('returns valid response', async () => {
    const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
    let response = await request(server).post('/users').send(user)
    const {refresh_token} = response.body

    response = await request(server)
      .post('/access-tokens/refresh')
      .send({refresh_token: refresh_token})

    expect(response.status).toBe(200)
    verifyHeaders(response)
    expect(response.body.jwt).toBeTruthy()
  })

  it('returns valid jwt', async () => {
    const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
    let response = await request(server).post('/users').send(user)
    let {refresh_token} = response.body

    response = await request(server)
      .post('/access-tokens/refresh')
      .send({refresh_token: refresh_token})

    let {jwt} = response.body
    response = await request(server).get('/me').set('X-Access-Token', jwt)

    expect(response.body.email).toBe(user.email)
    expect(response.body.name).toBe(user.name)
  })

  it('handles invalid user input', async () => {
    let response = await request(server).post('/access-tokens/refresh')
    expect(response.status).toBe(400)
    verifyHeaders(response)
    expect(response.body.msg).toBe('Bad Request')
    expect(response.body.errors).toBeTruthy()

    response = await request(server)
      .post('/access-tokens/refresh')
      .send({refresh_token: ''})

    expect(response.status).toBe(400)
    verifyHeaders(response)
    expect(response.body.msg).toBe('Bad Request')
    expect(response.body.errors).toBeTruthy()

    response = await request(server)
      .post('/access-tokens/refresh')
      .send({refresh_token: 'token'})

    expect(response.status).toBe(400)
    verifyHeaders(response)
    expect(response.body.msg).toBe('Bad Request')
    expect(response.body.errors).toBeTruthy()
  })

  describe('POST /access-tokens', () => {
    beforeEach(async () => {
      await pg.query('truncate users restart identity cascade')
    })

    it('returns valid response', async () => {
      const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
      let response = await request(server).post('/users').send(user)

      response = await request(server)
        .post('/access-tokens')
        .send({email: user.email, password: user.password})

      expect(response.status).toBe(201)
      verifyHeaders(response)
      expect(response.body.jwt).toBeTruthy()
      expect(response.body.refresh_token).toBeTruthy()
    })

    it('returns valid jwt', async () => {
      const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
      let response = await request(server).post('/users').send(user)
      let {refresh_token} = response.body

      response = await request(server)
        .post('/access-tokens')
        .send({email: user.email, password: user.password})

      const {jwt} = response.body
      response = await request(server).get('/me').set('X-Access-Token', jwt)

      expect(response.body.email).toBe(user.email)
      expect(response.body.name).toBe(user.name)
    })

    it('stores a refresh token', async () => {
      const redisClient = Redis()
      await redisClient.flushall()

      const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
      await request(server).post('/users').send(user)

      let response = await request(server)
        .post('/access-tokens')
        .send({email: user.email, password: user.password})

      const {refresh_token} = response.body
      const value = await redisClient.get(refresh_token)
      expect(value).toBe(''+1)
      redisClient.flushall()
    })

    it('handles invalid user input', async () => {
      const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
      await request(server).post('/users').send(user)

      let response = await request(server).post('/access-tokens')
      expect(response.status).toBe(401)
      verifyHeaders(response)
      expect(response.body).toEqual({msg: 'Unauthorized'})

      response = await request(server).post('/access-tokens').send({email: user.email})
      expect(response.status).toBe(401)
      verifyHeaders(response)
      expect(response.body).toEqual({msg: 'Unauthorized'})

      response = await request(server).post('/access-tokens').send({password: user.password})
      expect(response.status).toBe(401)
      verifyHeaders(response)
      expect(response.body).toEqual({msg: 'Unauthorized'})

      response = await request(server)
        .post('/access-tokens')
        .send({email: user.email, password: 'password'})

      expect(response.status).toBe(401)
      verifyHeaders(response)
      expect(response.body).toEqual({msg: 'Unauthorized'})

      response = await request(server)
        .post('/access-tokens')
        .send({email: user.email+'@', password: user.password})

      expect(response.status).toBe(401)
      verifyHeaders(response)
      expect(response.body).toEqual({msg: 'Unauthorized'})
    })
  })

  describe('DELETE /access-tokens', () => {
    beforeEach(async () => {
      await pg.query('truncate users restart identity cascade')
    })

    it('returns valid response', async () => {
      const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
      let response = await request(server).post('/users').send(user)
      const {jwt, refresh_token} = response.body

      response = await request(server)
        .delete('/access-tokens')
        .set('X-Access-Token', jwt)
        .send({refresh_token: refresh_token})

      expect(response.status).toBe(204)
      verifyHeaders(response, ['content-type', 'content-length'])
      expect(response.body).toEqual({})
    })

    it('deletes the refresh token', async () => {
      const redisClient = Redis()
      await redisClient.flushall()

      const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
      let response = await request(server).post('/users').send(user)
      const {jwt, refresh_token} = response.body

      response = await request(server)
        .delete('/access-tokens')
        .set('X-Access-Token', jwt)
        .send({refresh_token: refresh_token})

      const value = await redisClient.get(refresh_token)
      expect(value).toBeNull()
      redisClient.flushall()
    })

    it('handles invalid tokens', async () => {
      const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
      let response = await request(server).post('/users').send(user)
      const {jwt} = response.body

      response = await request(server)
        .delete('/access-tokens')
        .set('X-Access-Token', '')
      expect(response.status).toBe(401)
      verifyHeaders(response)
      expect(response.body).toEqual({msg: 'Unauthorized'})

      response = await request(server)
        .delete('/access-tokens')
      expect(response.status).toBe(401)
      verifyHeaders(response)
      expect(response.body).toEqual({msg: 'Unauthorized'})

      response = await request(server)
        .delete('/access-tokens')
        .set('X-Access-Token', jwt.slice(0, -1))
      expect(response.status).toBe(401)
      verifyHeaders(response)
      expect(response.body).toEqual({msg: 'Unauthorized'})
    })

    it('handles invalid user input', async () => {
      const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
      let response = await request(server).post('/users').send(user)
      const {jwt} = response.body

      response = await request(server)
        .delete('/access-tokens')
        .set('X-Access-Token', jwt)

      expect(response.status).toBe(400)
      verifyHeaders(response)
      expect(response.body.msg).toBe('Bad Request')
      expect(response.body.errors).toBeTruthy()

      response = await request(server)
        .delete('/access-tokens')
        .send({refresh_token: ''})
        .set('X-Access-Token', jwt)

      expect(response.status).toBe(400)
      verifyHeaders(response)
      expect(response.body.msg).toBe('Bad Request')
      expect(response.body.errors).toBeTruthy()

      response = await request(server)
        .delete('/access-tokens')
        .send({refresh_token: 'token'})
        .set('X-Access-Token', jwt)

      expect(response.status).toBe(400)
      verifyHeaders(response)
      expect(response.body.msg).toBe('Bad Request')
      expect(response.body.errors).toBeTruthy()
    })
  })
})
