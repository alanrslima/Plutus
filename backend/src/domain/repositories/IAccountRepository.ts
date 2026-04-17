import { Account } from '../entities/Account'

export interface IAccountRepository {
  findById(id: string, userId: string): Promise<Account | null>
  findAllByUser(userId: string): Promise<Account[]>
  create(data: Omit<Account, 'id' | 'createdAt'>): Promise<Account>
  update(id: string, userId: string, data: Partial<Pick<Account, 'name' | 'color' | 'balance'>>): Promise<Account>
  delete(id: string, userId: string): Promise<void>
  updateBalance(id: string, delta: number): Promise<void>
}
