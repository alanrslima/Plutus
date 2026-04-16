import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middlewares/authMiddleware'
import { CategoriesUseCase } from '../../application/use-cases/categories/CategoriesUseCase'
import { PrismaCategoryRepository } from '../../infra/database/repositories/PrismaCategoryRepository'

const categoryRepo = new PrismaCategoryRepository()
const useCase = new CategoriesUseCase(categoryRepo)

const typeEnum = z.enum(['income', 'expense', 'transfer'])
const createSchema = z.object({ name: z.string().min(1), type: typeEnum })
const updateSchema = z.object({ name: z.string().min(1).optional(), type: typeEnum.optional() })

export class CategoriesController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const type = req.query.type as 'income' | 'expense' | 'transfer' | undefined
      const categories = await useCase.list(req.userId!, type)
      res.json(categories)
    } catch (err) { next(err) }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, type } = createSchema.parse(req.body)
      const category = await useCase.create(req.userId!, name, type)
      res.status(201).json(category)
    } catch (err) { next(err) }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = updateSchema.parse(req.body)
      const category = await useCase.update(req.params.id, req.userId!, data)
      res.json(category)
    } catch (err) { next(err) }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await useCase.delete(req.params.id, req.userId!)
      res.status(204).send()
    } catch (err) { next(err) }
  }
}
