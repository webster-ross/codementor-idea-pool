import request from 'supertest'
import loremIpsum from 'lorem-ipsum'
import pg from '../../src/postgres'
import Redis from '../../src/redis'
import Server from '../../src/server'
import {verifyHeaders} from '../utils'

const server = Server()

beforeAll(() => pg.connect())
//afterAll(() => pg.end())

describe('GET /ideas', () => {
  beforeEach(async () => {
    await pg.query('truncate users restart identity cascade')
    await pg.query('truncate ideas restart identity cascade')
  })

  it('returns valid response', async () => {
    const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
    let response = await request(server).post('/users').send(user)
    const {jwt} = response.body

    const count = 3
    for (let i = 0; i < count; i++) {
      const idea = {content: ' some idea ', impact: Math.min(1 + i, 10), ease: 8, confidence: 10}
      response = await request(server)
        .post('/ideas')
        .set('X-Access-Token', jwt)
        .send(idea)
    }

    response = await request(server)
      .get('/ideas')
      .set('X-Access-Token', jwt)

    expect(response.status).toBe(200)
    verifyHeaders(response)
    expect(response.body.length).toBe(count)

    const idea = response.body[0]
    expect(idea.id).toBeTruthy()
    expect(idea.content).toBe('some idea')
    expect(idea.impact).toBe(3)
    expect(idea.ease).toBe(8)
    expect(idea.confidence).toBe(10)
    expect(idea.created_at).toBeTruthy()
    expect(idea.average_score).toBe(7)

    let isOrdered = true
    const ideas = response.body
    ideas.forEach((idea, index) => {
      if (index < ideas.length - 1) {
        isOrdered = isOrdered && (idea.average_score >= ideas[index + 1].average_score)
      }
    })
    expect(isOrdered).toBe(true)
  })

  it('only returns ideas created by the authenticated user', async () => {
    const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
    let response = await request(server).post('/users').send(user)
    const {jwt} = response.body

    const count = 3
    for (let i = 0; i < count; i++) {
      const idea = {content: ' some idea ', impact: Math.min(1 + i, 10), ease: 8, confidence: 10}
      response = await request(server)
        .post('/ideas')
        .set('X-Access-Token', jwt)
        .send(idea)
    }

    user.email = 'new@test.com'
    response = await request(server).post('/users').send(user)
    const {jwt: jwt2} = response.body

    response = await request(server)
      .get('/ideas')
      .set('X-Access-Token', jwt2)

    expect(response.status).toBe(200)
    verifyHeaders(response)
    expect(response.body).toEqual([])
  })

  it('handles paging', async () => {
    const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
    let response = await request(server).post('/users').send(user)
    const {jwt} = response.body

    const count = 23
    for (let i = 0; i < count; i++) {
      const idea = {content: ' some idea ', impact: 6, ease: 8, confidence: 10}
      response = await request(server)
        .post('/ideas')
        .set('X-Access-Token', jwt)
        .send(idea)
    }

    response = await request(server)
      .get('/ideas?page=1')
      .set('X-Access-Token', jwt)

    expect(response.status).toBe(200)
    verifyHeaders(response)
    expect(response.body.length).toBe(10)

    response = await request(server)
      .get('/ideas?page=2')
      .set('X-Access-Token', jwt)

    expect(response.status).toBe(200)
    verifyHeaders(response)
    expect(response.body.length).toBe(10)

    response = await request(server)
      .get('/ideas?page=3')
      .set('X-Access-Token', jwt)

    expect(response.status).toBe(200)
    verifyHeaders(response)
    expect(response.body.length).toBe(3)

    response = await request(server)
      .get('/ideas?page=4')
      .set('X-Access-Token', jwt)

    expect(response.status).toBe(200)
    verifyHeaders(response)
    expect(response.body.length).toBe(0)

    response = await request(server)
      .get('/ideas?page=0')
      .set('X-Access-Token', jwt)

    expect(response.status).toBe(200)
    verifyHeaders(response)
    expect(response.body.length).toBe(23)

    response = await request(server)
      .get('/ideas?page=??')
      .set('X-Access-Token', jwt)

    expect(response.status).toBe(200)
    verifyHeaders(response)
    expect(response.body.length).toBe(23)
  })

  it('handles invalid tokens', async () => {
    const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
    let response = await request(server).post('/users').send(user)
    const {jwt} = response.body

    response = await request(server)
      .get('/ideas')
      .set('X-Access-Token', '')

    expect(response.status).toBe(401)
    verifyHeaders(response)
    expect(response.body).toEqual({msg: 'Unauthorized'})

    response = await request(server)
      .get('/ideas')

    expect(response.status).toBe(401)
    verifyHeaders(response)
    expect(response.body).toEqual({msg: 'Unauthorized'})

    response = await request(server)
      .get('/ideas')
      .set('X-Access-Token', jwt.slice(0, -1))

    expect(response.status).toBe(401)
    verifyHeaders(response)
    expect(response.body).toEqual({msg: 'Unauthorized'})
  })

})

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

describe('DELETE /ideas/:id', () => {
  beforeEach(async () => {
    await pg.query('truncate users restart identity cascade')
    await pg.query('truncate ideas restart identity cascade')
  })

  it('returns valid response', async () => {
    const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
    let response = await request(server).post('/users').send(user)
    const {jwt} = response.body

    response = await request(server)
      .post('/ideas')
      .set('X-Access-Token', jwt)
      .send({content: 'something', impact: 1, ease: 8, confidence: 1})

    const idea = response.body

    response = await request(server)
      .delete(`/ideas/${idea.id}`)
      .set('X-Access-Token', jwt)

    expect(response.status).toBe(204)
    verifyHeaders(response, ['content-type', 'content-length'])
    expect(response.body).toEqual({})
  })

  it('deletes a idea', async () => {
    const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
    let response = await request(server).post('/users').send(user)
    const {jwt} = response.body

    response = await request(server)
      .post('/ideas')
      .set('X-Access-Token', jwt)
      .send({content: 'something', impact: 1, ease: 8, confidence: 1})

    const idea = response.body

    response = await request(server)
      .delete(`/ideas/${idea.id}`)
      .set('X-Access-Token', jwt)

    const {rows} = await pg.query(`select * from ideas where id = '${idea.id}'`)
    expect(rows.length).toBe(0)
  })

  it('handles invalid tokens', async () => {
    const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
    let response = await request(server).post('/users').send(user)
    const {jwt} = response.body

    response = await request(server)
      .post('/ideas')
      .set('X-Access-Token', jwt)
      .send({content: 'something', impact: 1, ease: 8, confidence: 1})

    const idea = response.body

    response = await request(server)
      .delete(`/ideas/${idea.id}`)
      .set('X-Access-Token', '')

    expect(response.status).toBe(401)
    verifyHeaders(response)
    expect(response.body).toEqual({msg: 'Unauthorized'})

    response = await request(server).delete(`/ideas/${idea.id}`)
    expect(response.status).toBe(401)
    verifyHeaders(response)
    expect(response.body).toEqual({msg: 'Unauthorized'})

    response = await request(server)
      .delete(`/ideas/${idea.id}`)
      .set('X-Access-Token', jwt.slice(0, -1))

    expect(response.status).toBe(401)
    verifyHeaders(response)
    expect(response.body).toEqual({msg: 'Unauthorized'})
  })

  it('handles invalid idea id params', async () => {
    const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
    let response = await request(server).post('/users').send(user)
    const {jwt} = response.body

    response = await request(server)
      .post('/ideas')
      .set('X-Access-Token', jwt)
      .send({content: 'something', impact: 1, ease: 8, confidence: 1})

    const idea = response.body

    response = await request(server)
      .delete(`/ideas`)
      .set('X-Access-Token', jwt)

    expect(response.status).toBe(404)
    verifyHeaders(response)
    expect(response.body).toEqual({msg: 'Not Found'})

    response = await request(server)
      .delete(`/ideas/`)
      .set('X-Access-Token', jwt)

    expect(response.status).toBe(404)
    verifyHeaders(response)
    expect(response.body).toEqual({msg: 'Not Found'})

    response = await request(server)
      .delete(`/ideas/badid`)
      .set('X-Access-Token', jwt)

    expect(response.status).toBe(404)
    verifyHeaders(response)
    expect(response.body).toEqual({msg: 'Not Found'})
  })

  it('prevents user deleting other user\'s idea', async () => {
    const user = {email: 'email@test.com', name: 'Tester', password: 'Test1234'}
    let response = await request(server).post('/users').send(user)
    let {jwt} = response.body

    response = await request(server)
      .post('/ideas')
      .set('X-Access-Token', jwt)
      .send({content: 'something', impact: 1, ease: 8, confidence: 1})

    const idea = response.body

    user.email = 'newemail@test.com'
    response = await request(server).post('/users').send(user)
    let {jwt: jwt2} = response.body

    response = await request(server)
      .delete(`/ideas/${idea.id}`)
      .set('X-Access-Token', jwt2)

    expect(response.status).toBe(404)
    verifyHeaders(response)
    expect(response.body).toEqual({msg: 'Not Found'})
  })
})
