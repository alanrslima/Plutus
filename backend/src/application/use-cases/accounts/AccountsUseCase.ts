import { IAccountRepository } from '../../../domain/repositories/IAccountRepository'
import { Account } from '../../../domain/entities/Account'
import { AppError } from '../../errors/AppError'

export class AccountsUseCase {
  constructor(private accountRepository: IAccountRepository) {}

  async list(userId: string): Promise<Account[]> {
    return this.accountRepository.findAllByUser(userId)
  }

  async create(userId: string, name: string, balance = 0, color?: string): Promise<Account> {
    return this.accountRepository.create({ userId, name, color, balance })
  }

  async update(id: string, userId: string, data: { name?: string; color?: string; balance?: number }): Promise<Account> {
    const existing = await this.accountRepository.findById(id, userId)
    if (!existing) throw new AppError('Account not found', 404)
    return this.accountRepository.update(id, userId, data)
  }

  async delete(id: string, userId: string): Promise<void> {
    const existing = await this.accountRepository.findById(id, userId)
    if (!existing) throw new AppError('Account not found', 404)
    return this.accountRepository.delete(id, userId)
  }
}
