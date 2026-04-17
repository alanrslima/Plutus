import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middlewares/authMiddleware'
import { AccountsUseCase } from '../../application/use-cases/accounts/AccountsUseCase'
import { PrismaAccountRepository } from '../../infra/database/repositories/PrismaAccountRepository'

const accountRepo = new PrismaAccountRepository()
const useCase = new AccountsUseCase(accountRepo)

const createSchema = z.object({ name: z.string().min(1), color: z.string().optional(), balance: z.number().optional() })
const updateSchema = z.object({ name: z.string().min(1).optional(), color: z.string().optional(), balance: z.number().optional() })

export class AccountsController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const accounts = await useCase.list(req.userId!)
      res.json(accounts)
    } catch (err) { next(err) }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, color, balance } = createSchema.parse(req.body)
      const account = await useCase.create(req.userId!, name, balance, color)
      res.status(201).json(account)
    } catch (err) { next(err) }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = updateSchema.parse(req.body)
      const account = await useCase.update(req.params.id, req.userId!, data)
      res.json(account)
    } catch (err) { next(err) }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await useCase.delete(req.params.id, req.userId!)
      res.status(204).send()
    } catch (err) { next(err) }
  }
}
