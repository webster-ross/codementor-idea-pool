import request from 'supertest'
import Server from '../../src/server'
import configs from '../../src/configs'
import {verifyHeaders} from '../utils'

const server = Server()

describe('GET /', () => {
  it('returns valid response', async () => {
    const response = await request(server).get('/')
    expect(response.status).toBe(200)
    verifyHeaders(response)
    expect(response.body).toEqual({
      msg: `Idea Pool API v${process.env.npm_package_version}`
    })
  })
})
