import { IAccountRepository } from '../../../domain/repositories/IAccountRepository'
import { Account } from '../../../domain/entities/Account'
import { prisma } from '../prisma'

function toAccount(raw: { id: string; userId: string; name: string; balance: { toNumber: () => number } | number; createdAt: Date }): Account {
  return {
    id: raw.id,
    userId: raw.userId,
    name: raw.name,
    balance: typeof raw.balance === 'object' ? raw.balance.toNumber() : raw.balance,
    createdAt: raw.createdAt,
  }
}

export class PrismaAccountRepository implements IAccountRepository {
  async findById(id: string, userId: string): Promise<Account | null> {
    const account = await prisma.account.findFirst({ where: { id, userId } })
    return account ? toAccount(account) : null
  }

  async findAllByUser(userId: string): Promise<Account[]> {
    const accounts = await prisma.account.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
    return accounts.map(toAccount)
  }

  async create(data: Omit<Account, 'id' | 'createdAt'>): Promise<Account> {
    const account = await prisma.account.create({ data })
    return toAccount(account)
  }

  async update(id: string, userId: string, data: Partial<Pick<Account, 'name' | 'balance'>>): Promise<Account> {
    const account = await prisma.account.update({ where: { id }, data })
    return toAccount(account)
  }

  async delete(id: string, userId: string): Promise<void> {
    await prisma.account.delete({ where: { id } })
  }

  async updateBalance(id: string, delta: number): Promise<void> {
    await prisma.account.update({
      where: { id },
      data: { balance: { increment: delta } },
    })
  }
}
