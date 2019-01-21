import {Router} from 'express'
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
                                   values ($1, $2, $3, $4, $5) returning *`,
                                   [content, impact, ease, confidence, req.user])
    const idea = rows[0]
    const averageScore = (idea.impact + idea.ease + idea.confidence) / 3.0
    idea.average_score = parseFloat(averageScore.toFixed(1))
    idea.created_at = parseFloat((new Date(idea.created_at).getTime() / 1000).toFixed(0))
    delete idea.user_id

    res.status(201).send(idea)
  }
  catch(e) { next(e) }
})

export default router
