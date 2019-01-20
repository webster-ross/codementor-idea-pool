import {Router} from 'express'
import jwt from 'jsonwebtoken'
import md5 from 'md5'
import pg from '../postgres'
import configs from '../configs'

const router = Router()

// handle get request => Current User
router.get('/', async (req, res, next) => {
  let userId

  // validate token
  try {
    const token = req.header('X-Access-Token')
    const decoded = jwt.verify(token, configs.JWT_SECRET)
    userId = decoded.user
  }
  catch(e) { return res.status(401).send({msg: 'Unauthorized'}) }

  // get user from db
  try {
    const {rows} = await pg.query(`select email, name from users where id = $1`, [userId])
    const user = rows[0]
    const avatar = `https://www.gravatar.com/avatar/${md5(user.email.toLowerCase().trim())}`
    user.avatar_url = avatar
    res.status(200).send(user)
  }
  catch(e) { next(e) }
})

export default router
