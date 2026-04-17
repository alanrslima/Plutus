import { IImportRepository, CreateImportHistoryInput, ImportHistoryDetail } from '../../../domain/repositories/IImportRepository'
import { ImportHistory } from '../../../domain/entities/ImportHistory'
import { FileType, ImportStatus } from '../../../domain/entities/ImportHistory'
import { prisma } from '../prisma'

function toImportHistory(raw: {
  id: string
  userId: string
  accountId: string
  filename: string
  fileType: string
  status: string
  importedCount: number
  skippedCount: number
  errorMessage: string | null
  createdAt: Date
}): ImportHistory {
  return {
    id: raw.id,
    userId: raw.userId,
    accountId: raw.accountId,
    filename: raw.filename,
    fileType: raw.fileType as FileType,
    status: raw.status as ImportStatus,
    importedCount: raw.importedCount,
    skippedCount: raw.skippedCount,
    errorMessage: raw.errorMessage,
    createdAt: raw.createdAt,
  }
}

export class PrismaImportRepository implements IImportRepository {
  async createImportHistory(data: CreateImportHistoryInput): Promise<ImportHistory> {
    const record = await prisma.importHistory.create({ data })
    return toImportHistory(record)
  }

  async findHistoryByAccount(accountId: string, userId: string): Promise<ImportHistory[]> {
    const records = await prisma.importHistory.findMany({
      where: { accountId, userId },
      orderBy: { createdAt: 'desc' },
    })
    return records.map(toImportHistory)
  }

  async findHistoryByUser(userId: string): Promise<(ImportHistory & { accountName: string })[]> {
    const records = await prisma.importHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { account: { select: { name: true } } },
    })
    return records.map((r) => ({
      ...toImportHistory(r),
      accountName: r.account.name,
    }))
  }

  async existsByFileHash(userId: string, fileHash: string): Promise<boolean> {
    const count = await prisma.importHistory.count({ where: { userId, fileHash } })
    return count > 0
  }

  async findDetailById(id: string, userId: string): Promise<ImportHistoryDetail | null> {
    const record = await prisma.importHistory.findFirst({
      where: { id, userId },
      include: {
        account: { select: { name: true } },
        transactions: {
          orderBy: { date: 'desc' },
          include: { category: { select: { name: true } } },
        },
      },
    })
    if (!record) return null

    return {
      ...toImportHistory(record),
      accountName: record.account.name,
      transactions: record.transactions.map((t) => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        type: t.type as 'income' | 'expense' | 'transfer',
        date: t.date,
        categoryName: t.category?.name ?? null,
        externalId: t.externalId,
      })),
    }
  }
}
