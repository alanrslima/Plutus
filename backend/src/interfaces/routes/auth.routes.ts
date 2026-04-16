import { Router } from 'express'
import { AuthController } from '../controllers/AuthController'

const router = Router()
const controller = new AuthController()

router.post('/register', (req, res, next) => controller.register(req, res, next))
router.post('/login', (req, res, next) => controller.login(req, res, next))

export default router
