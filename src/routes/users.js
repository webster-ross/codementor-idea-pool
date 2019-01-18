import {Router} from 'express'

const router = Router()

// handle post reqest => Sign Up
router.post('/', (req, res) => res.status(201).send({}))

export default router
