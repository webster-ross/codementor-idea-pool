import {Router} from 'express'
import jwt from 'jsonwebtoken'
import {check, validationResult} from 'express-validator/check'
import configs from '../configs'
import Redis from '../redis'
import pg from '../postgres'

const router = Router()

// connect to redis
const redisClient = Redis()

// initialize input sanitization & validation
const validators = [
  check('refresh_token').custom(async (value = '') => {
    const userId = await redisClient.get(value)
    const {rows} = await pg.query(`select email, name from users where id = $1`, [userId])
    if(rows.length != 1) throw new Error('Invalid token')
  })
]

// handle post request => Refresh JWT
router.post('/refresh', validators, async (req, res, next) => {
  const {refresh_token: refreshToken} = req.body

  // validate input
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).send({msg: 'Bad Request', errors: errors.array()})
  }

  // create new jwt token
  try {
    const userId = await redisClient.get(refreshToken)
    const token = jwt.sign({user: userId}, configs.JWT_SECRET, {expiresIn: '10m'})
    res.status(200).send({jwt: token})
  }
  catch(e) { next(e) }
})

export default router
