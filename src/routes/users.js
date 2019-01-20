import {Router} from 'express'
import {Pool} from 'pg'
import {check, validationResult} from 'express-validator/check'
import {sanitizeBody} from 'express-validator/filter'
import titleCase from 'title-case'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import randToken from 'rand-token'
import redis from 'async-redis'
import configs from '../configs'

// connect to redis
const router = Router()
const redisClient = redis.createClient(configs.REDIS_URL)

// connect to postgres (use only one pool)
const pg = new Pool({connectionString: configs.PG_URI})

// initialize input sanitization & validation
const validators = [
  sanitizeBody('email').trim().normalizeEmail({all_lowercase: true}),
  sanitizeBody('name').trim().customSanitizer(value => titleCase(value)),
  sanitizeBody('password').trim(),
  check('email').isEmail().custom(async value => {
    const {rows} = await pg.query(`select * from users where email = $1`, [value])
    if (rows.length > 0) throw new Error('User already exists')
  }),
  check('name').isLength({min: 2}),
  check('password').matches('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})')
]

// handle post request => Sign Up
router.post('/', validators, async (req, res, next) => {
  // create user
  const {email, name, password} = req.body

  // validate input
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).send({errors: errors.array()})
  }

  // hash password
  const hashWord = await bcrypt.hash(password, 10)

  try {
    // add new user to db
    const {rows} = await pg.query(`insert into users (email, name, password)
                                 values ($1, $2, $3) returning id`, [email, name, hashWord])

    const userId = rows[0].id

    // create tokens
    const token = jwt.sign({user: userId}, configs.JWT_SECRET, {expiresIn: '10m'})
    const refreshToken = randToken.generate(64)

    // store refresh token to redis that expires in a week
    await redisClient.set(refreshToken, userId, 'EX', 604800)
    res.status(201).send({jwt: token, refresh_token: refreshToken})
  }
  catch(e) { next(e) }
})

export default router
