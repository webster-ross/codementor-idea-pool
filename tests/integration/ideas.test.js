import request from 'supertest'
import loremIpsum from 'lorem-ipsum'
import pg from '../../src/postgres'
import Redis from '../../src/redis'
import Server from '../../src/server'
import {verifyHeaders} from '../utils'

const server = Server()

beforeAll(() => pg.connect())
//afterAll(() => pg.end())

describe('POST /ideas', () => {
  beforeEach(async () => {
    await pg.query('truncate users restart identity cascade')
    await pg.query('truncate ideas restart identity cascade')
  })

  it('returns valid response', async () => {
    const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
    let response = await request(server).post('/users').send(user)
    const {jwt} = response.body

    const idea = {content: ' some idea ', impact: 5, ease: 8, confidence: 10}
    response = await request(server)
      .post('/ideas')
      .set('X-Access-Token', jwt)
      .send(idea)

    expect(response.status).toBe(201)
    verifyHeaders(response)

    expect(response.body.id).toBeTruthy()
    expect(response.body.content).toBe(idea.content.trim())
    expect(response.body.impact).toBe(idea.impact)
    expect(response.body.ease).toBe(idea.ease)
    expect(response.body.confidence).toBe(idea.confidence)
    expect(response.body.created_at).toBeTruthy()

    let averageScore = (idea.impact + idea.ease + idea.confidence) / 3.0
    averageScore = parseFloat(averageScore.toFixed(1))
    expect(response.body.average_score).toBe(averageScore)
  })

  it('creates a new idea', async () => {
    const redisClient = Redis()
    await redisClient.flushall()

    const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
    let response = await request(server).post('/users').send(user)
    const {jwt, refresh_token} = response.body
    const userId = await redisClient.get(refresh_token)

    const idea = {content: ' some idea ', impact: 5, ease: 8, confidence: 10}

    response = await request(server)
      .post('/ideas')
      .set('X-Access-Token', jwt)
      .send(idea)

    const {rows} = await pg.query(`select * from ideas where user_id = ${userId}`)
    const {content, impact, ease, confidence, user_id, created_at} = rows[0]

    expect(content).toBe(idea.content.trim())
    expect(impact).toBe(idea.impact)
    expect(ease).toBe(idea.ease)
    expect(confidence).toBe(idea.confidence)
    expect(user_id).toBe(parseInt(userId))
    expect(created_at).toBeTruthy()

    redisClient.flushall()
  })

  it('handles invalid tokens', async () => {
    const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
    let response = await request(server).post('/users').send(user)
    const {jwt} = response.body

    response = await request(server)
      .post('/ideas')
      .set('X-Access-Token', '')

    expect(response.status).toBe(401)
    verifyHeaders(response)
    expect(response.body).toEqual({msg: 'Unauthorized'})

    response = await request(server)
      .post('/ideas')

    expect(response.status).toBe(401)
    verifyHeaders(response)
    expect(response.body).toEqual({msg: 'Unauthorized'})

    response = await request(server)
      .post('/ideas')
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
      .post('/ideas')
      .set('X-Access-Token', jwt)

    expect(response.status).toBe(400)
    verifyHeaders(response)
    expect(response.body.msg).toBe('Bad Request')
    expect(response.body.errors).toBeTruthy()

    response = await request(server)
      .post('/ideas')
      .set('X-Access-Token', jwt)
      .send({content: 'something', impact: 5, ease: 8})

    expect(response.status).toBe(400)
    verifyHeaders(response)
    expect(response.body.msg).toBe('Bad Request')
    expect(response.body.errors).toBeTruthy()

    response = await request(server)
      .post('/ideas')
      .set('X-Access-Token', jwt)
      .send({content: 'something', impact: 5, confidence: 10})

    expect(response.status).toBe(400)
    verifyHeaders(response)
    expect(response.body.msg).toBe('Bad Request')
    expect(response.body.errors).toBeTruthy()

    response = await request(server)
      .post('/ideas')
      .set('X-Access-Token', jwt)
      .send({content: 'something', ease: 8, confidence: 10})

    expect(response.status).toBe(400)
    verifyHeaders(response)
    expect(response.body.msg).toBe('Bad Request')
    expect(response.body.errors).toBeTruthy()

    response = await request(server)
      .post('/ideas')
      .set('X-Access-Token', jwt)
      .send({impact: 5, ease: 8, confidence: 10})

    expect(response.status).toBe(400)
    verifyHeaders(response)
    expect(response.body.msg).toBe('Bad Request')
    expect(response.body.errors).toBeTruthy()

    response = await request(server)
      .post('/ideas')
      .set('X-Access-Token', jwt)
      .send({content: ' ', impact: 5, ease: 8, confidence: 10})

    expect(response.status).toBe(400)
    verifyHeaders(response)
    expect(response.body.msg).toBe('Bad Request')
    expect(response.body.errors).toBeTruthy()

    response = await request(server)
      .post('/ideas')
      .set('X-Access-Token', jwt)
      .send({
        content: loremIpsum({count: 100, units: 'words'}),
        impact: 5,
        ease: 8,
        confidence: 10
      })

    expect(response.status).toBe(400)
    verifyHeaders(response)
    expect(response.body.msg).toBe('Bad Request')
    expect(response.body.errors).toBeTruthy()

    response = await request(server)
      .post('/ideas')
      .set('X-Access-Token', jwt)
      .send({content: 'something', impact: -1, ease: 8, confidence: 10})

    expect(response.status).toBe(400)
    verifyHeaders(response)
    expect(response.body.msg).toBe('Bad Request')
    expect(response.body.errors).toBeTruthy()

    response = await request(server)
      .post('/ideas')
      .set('X-Access-Token', jwt)
      .send({content: 'something', impact: 1, ease: -8, confidence: 10})

    expect(response.status).toBe(400)
    verifyHeaders(response)
    expect(response.body.msg).toBe('Bad Request')
    expect(response.body.errors).toBeTruthy()

    response = await request(server)
      .post('/ideas')
      .set('X-Access-Token', jwt)
      .send({content: 'something', impact: 1, ease: 8, confidence: 0})

    expect(response.status).toBe(400)
    verifyHeaders(response)
    expect(response.body.msg).toBe('Bad Request')
    expect(response.body.errors).toBeTruthy()

    response = await request(server)
      .post('/ideas')
      .set('X-Access-Token', jwt)
      .send({content: 'something', impact: 11, ease: 8, confidence: 3})

    expect(response.status).toBe(400)
    verifyHeaders(response)
    expect(response.body.msg).toBe('Bad Request')
    expect(response.body.errors).toBeTruthy()

    response = await request(server)
      .post('/ideas')
      .set('X-Access-Token', jwt)
      .send({content: 'something', impact: 1, ease: 18, confidence: 3})

    expect(response.status).toBe(400)
    verifyHeaders(response)
    expect(response.body.msg).toBe('Bad Request')
    expect(response.body.errors).toBeTruthy()

    response = await request(server)
      .post('/ideas')
      .set('X-Access-Token', jwt)
      .send({content: 'something', impact: 1, ease: 8, confidence: 13})

    expect(response.status).toBe(400)
    verifyHeaders(response)
    expect(response.body.msg).toBe('Bad Request')
    expect(response.body.errors).toBeTruthy()
  })
})
