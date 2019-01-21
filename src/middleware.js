import jwt from 'jsonwebtoken'
import configs from './configs'

export function auth(req, res, next) {
  // validate token
  try {
    const token = req.header('X-Access-Token')
    const decoded = jwt.verify(token, configs.JWT_SECRET)
    req.user = decoded.user
    next()
  }
  catch(e) { res.status(401).send({msg: 'Unauthorized'}) }
}
