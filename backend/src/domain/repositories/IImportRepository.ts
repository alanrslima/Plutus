import { ImportHistory, FileType, ImportStatus } from '../entities/ImportHistory'

export interface CreateImportHistoryInput {
  userId: string
  accountId: string
  filename: string
  fileType: FileType
  status: ImportStatus
  importedCount: number
  skippedCount: number
  errorMessage?: string
  fileHash?: string
}

export interface ImportedTransaction {
  id: string
  description: string | null
  amount: number
  type: 'income' | 'expense' | 'transfer'
  date: Date
  categoryName: string | null
  externalId: string | null
}

export interface ImportHistoryDetail extends ImportHistory {
  accountName: string
  transactions: ImportedTransaction[]
}

export interface IImportRepository {
  createImportHistory(data: CreateImportHistoryInput): Promise<ImportHistory>
  findHistoryByAccount(accountId: string, userId: string): Promise<ImportHistory[]>
  findHistoryByUser(userId: string): Promise<ImportHistory[]>
  findDetailById(id: string, userId: string): Promise<ImportHistoryDetail | null>
  existsByFileHash(userId: string, fileHash: string): Promise<boolean>
}
