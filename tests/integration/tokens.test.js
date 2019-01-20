import request from 'supertest'
import pg from '../../src/postgres'
import Server from '../../src/server'
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
})
