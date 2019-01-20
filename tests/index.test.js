import request from 'supertest'
import port from 'get-port'
import createServer from '../src/server'
import configs from '../src/configs'
import {verifyHeader} from './utils'

// start a server instance with a dynamic port
const server = createServer(async () => await port())

afterEach(() => server.close())

describe('GET /', () => {
  it('returns valid response', async () => {
    const response = await request(server).get('/')
    expect(response.status).toBe(200)
    verifyHeader(response)
    expect(response.body).toEqual({
      message: `Idea Pool API v${process.env.npm_package_version}`
    })
  })
})
