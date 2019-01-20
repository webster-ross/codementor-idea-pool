import express from 'express'
import bodyParser from 'body-parser'
import cacheControl from 'express-cache-controller'
import helmet from 'helmet'
import requestId from 'express-request-id'
import responseTime from 'response-time'
import users from './routes/users'

export default (port) => {
  const app = express()

  // setup middlewear
  app.use(bodyParser.json())
  app.use(helmet())
  app.use(cacheControl({maxAge: 0, private: true, mustRevalidate: true}))
  app.use(requestId())
  app.use(responseTime({header: 'X-Runtime'}))
  app.use((req, res, next) => {
    res.vary('Accept-Encoding, Origin')
    next()
  })

  // setup routes
  app.get('/', (req, res) => res.send({
    message: `Idea Pool API v${process.env.npm_package_version}`
  }))

  app.use('/users', users)

  // default error handler
  app.use((err, req, res, next) => {
    console.error(err)
    if (err.statusCode == 400) res.status(400).send({msg: 'Bad Request'})
    else res.status(500).send({msg: 'Internal Server Error'})
  })

  // start server
  return app.listen(port)
}
