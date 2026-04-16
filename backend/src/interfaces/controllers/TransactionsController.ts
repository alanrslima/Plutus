import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middlewares/authMiddleware'
import { TransactionsUseCase } from '../../application/use-cases/transactions/TransactionsUseCase'
import { PrismaTransactionRepository } from '../../infra/database/repositories/PrismaTransactionRepository'
import { PrismaAccountRepository } from '../../infra/database/repositories/PrismaAccountRepository'

const transactionRepo = new PrismaTransactionRepository()
const accountRepo = new PrismaAccountRepository()
const useCase = new TransactionsUseCase(transactionRepo, accountRepo)

const typeEnum = z.enum(['income', 'expense', 'transfer'])

const createSchema = z.object({
  accountId: z.string().uuid(),
  destinationAccountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: typeEnum,
  amount: z.number().positive(),
  description: z.string().optional(),
  date: z.string().datetime(),
  totalInstallments: z.number().int().min(1).max(60).optional(),
})

const updateSchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: typeEnum.optional(),
  amount: z.number().positive().optional(),
  description: z.string().optional(),
  date: z.string().datetime().optional(),
})

export class TransactionsController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { accountId, categoryId, type, startDate, endDate } = req.query
      const transactions = await useCase.list(req.userId!, {
        accountId: accountId as string,
        categoryId: categoryId as string,
        type: type as 'income' | 'expense' | 'transfer',
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      })
      res.json(transactions)
    } catch (err) { next(err) }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createSchema.parse(req.body)
      const transactions = await useCase.create({
        ...data,
        userId: req.userId!,
        date: new Date(data.date),
      })
      res.status(201).json(transactions)
    } catch (err) { next(err) }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = updateSchema.parse(req.body)
      const transaction = await useCase.update(req.params.id, req.userId!, {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      })
      res.json(transaction)
    } catch (err) { next(err) }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await useCase.delete(req.params.id, req.userId!)
      res.status(204).send()
    } catch (err) { next(err) }
  }
}
