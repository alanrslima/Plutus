import { Router } from 'express'
import { TransactionsController } from '../controllers/TransactionsController'
import { authMiddleware } from '../middlewares/authMiddleware'

const router = Router()
const controller = new TransactionsController()

router.use(authMiddleware)
router.get('/', (req, res, next) => controller.list(req as any, res, next))
router.post('/', (req, res, next) => controller.create(req as any, res, next))
router.put('/:id', (req, res, next) => controller.update(req as any, res, next))
router.delete('/:id', (req, res, next) => controller.delete(req as any, res, next))

export default router
