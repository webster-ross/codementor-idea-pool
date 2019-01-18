import request from 'supertest'
import port from 'get-port';
import createServer from '../src/server'
import configs from '../src/configs'
import {verifyHeader} from './utils'

// start a server instance with a dynamic port
const server = createServer(async () => await port())

afterEach(() => server.close())

describe('POST /users', () => {
  it('returns valid response', async () => {
    const response = await request(server).post('/users')
    expect(response.status).toBe(201)
    verifyHeader(response)
    expect(response.body.jwt).toBeTruthy()
    expect(response.body.refresh_token).toBeTruthy()
  })
})
