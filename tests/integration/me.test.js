import request from 'supertest'
import port from 'get-port'
import md5 from 'md5'
import pg from '../../src/postgres'
import Server from '../../src/server'
import {verifyHeaders} from '../utils'

const server = Server()

beforeAll(() => pg.connect())
//afterAll(() => pg.end())

describe('GET /me', () => {
  beforeEach(async () => {
    await pg.query('truncate users restart identity cascade')
  })

  it('returns valid response', async () => {
    const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
    let response = await request(server).post('/users').send(user)
    const {jwt} = response.body

    response = await request(server)
      .get('/me')
      .set('X-Access-Token', jwt)

    expect(response.status).toBe(200)
    verifyHeaders(response)
    expect(response.body).toEqual({
      email: user.email,
      name: user.name,
      avatar_url: `https://www.gravatar.com/avatar/${md5(user.email.toLowerCase().trim())}`
    })
  })

  it('handles invalid tokens', async () => {
    const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
    let response = await request(server).post('/users').send(user)
    const {jwt} = response.body

    response = await request(server)
      .get('/me')
      .set('X-Access-Token', '')
    expect(response.status).toBe(401)
    verifyHeaders(response)
    expect(response.body).toEqual({msg: 'Unauthorized'})

    response = await request(server)
      .get('/me')
    expect(response.status).toBe(401)
    verifyHeaders(response)
    expect(response.body).toEqual({msg: 'Unauthorized'})

    response = await request(server)
      .get('/me')
      .set('X-Access-Token', jwt.slice(0, -1))
    expect(response.status).toBe(401)
    verifyHeaders(response)
    expect(response.body).toEqual({msg: 'Unauthorized'})
  })
})
