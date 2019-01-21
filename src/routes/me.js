import {Router} from 'express'
import md5 from 'md5'
import pg from '../postgres'
import {auth} from '../middleware'

const router = Router()
router.use(auth)

// handle get request => Current User
router.get('/', async (req, res, next) => {
  // get user from db
  try {
    const {rows} = await pg.query(`select email, name from users where id = $1`, [req.user])
    const user = rows[0]
    const avatar = `https://www.gravatar.com/avatar/${md5(user.email.toLowerCase().trim())}`
    user.avatar_url = avatar
    res.status(200).send(user)
  }
  catch(e) { next(e) }
})

export default router
