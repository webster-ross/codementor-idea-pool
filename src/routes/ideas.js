import {Router} from 'express'
import validator from 'validator'
import {check, validationResult} from 'express-validator/check'
import {sanitizeBody} from 'express-validator/filter'
import pg from '../postgres'
import {auth} from '../middleware'

const router = Router()
router.use(auth)

// initialize input sanitization & validation
const validators = [
  sanitizeBody('content').trim(),
  check('content').isLength({min: 1, max: 255}),
  check('impact').isInt({min: 1, max: 10}),
  check('ease').isInt({min: 1, max: 10}),
  check('confidence').isInt({min: 1, max: 10})
]

// handle get request => Get Ideas
router.get('/', async (req, res, next) => {
  let offsetSQL = ''
  let {page} = req.query

  page = parseInt(page)
  if (page > 0) offsetSQL = `offset ${(page - 1) * 10}`

  try {
    // get ideas from db
    const {rows} = await pg.query(`select id, content, impact, ease, confidence, user_id,
                                   cast( round((impact + ease + confidence)/3.0, 1) as float) as average_score,
                                   round(extract(epoch from created_at)) as created_at
                                   from ideas where user_id = $1
                                   order by average_score desc, created_at desc
                                   limit 10 ${offsetSQL}`,
                                   [req.user])
    res.status(200).send(rows)
  }
  catch(e) { next(e) }
})

// handle post request => Create Idea
router.post('/', validators, async (req, res, next) => {
  const {content, impact, ease, confidence} = req.body

  // validate input
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).send({msg: 'Bad Request', errors: errors.array()})
  }

  try {
    // add new idea to db
    const {rows} = await pg.query(`insert into ideas (content, impact, ease, confidence, user_id)
                                   values ($1, $2, $3, $4, $5)
                                   returning id, content, impact, ease, confidence, user_id,
                                   cast( round((impact + ease + confidence)/3.0, 1) as float) as average_score,
                                   round(extract(epoch from created_at)) as created_at`,
                                   [content, impact, ease, confidence, req.user])
    const idea = rows[0]
    res.status(201).send(idea)
  }
  catch(e) { next(e) }
})

// handle put request => Update Idea
router.put('/:idea', validators, async (req, res, next) => {
  // verify idea param is valid
  const {idea} = req.params
  if (!validator.isUUID(idea)) return next()

  const {content, impact, ease, confidence} = req.body

  // validate input
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).send({msg: 'Bad Request', errors: errors.array()})
  }

  try {
    // update id in db
    const {rows} = await pg.query(`update ideas set (content, impact, ease, confidence) = ($1, $2, $3, $4)
                                   where user_id = $5
                                   returning id, content, impact, ease, confidence, user_id,
                                   cast( round((impact + ease + confidence)/3.0, 1) as float) as average_score,
                                   round(extract(epoch from created_at)) as created_at`,
                                   [content, impact, ease, confidence, req.user])
    if (rows.length < 1) next()

    const idea = rows[0]
    res.status(200).send(idea)
  }
  catch(e) { next(e) }
})

// handle delete request => Delete Idea
router.delete('/:idea', validators, async (req, res, next) => {
  // verify idea param is valid
  const {idea} = req.params
  if (!validator.isUUID(idea)) return next()

  try {
    // delete idea from db
    const {rows} = await pg.query(`delete from ideas where id = $1 and user_id = $2 returning *`,
                    [req.params.idea, req.user])
    if (rows.length < 1) next()
    else res.sendStatus(204)
  }
  catch(e) { next(e) }
})

export default router
