import { IImportRepository, ImportHistoryDetail } from '../../../domain/repositories/IImportRepository'
import { IAccountRepository } from '../../../domain/repositories/IAccountRepository'
import { ITransactionRepository } from '../../../domain/repositories/ITransactionRepository'
import { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository'
import { ImportHistory, FileType } from '../../../domain/entities/ImportHistory'
import { ParsedTransaction } from '../../../domain/entities/ParsedTransaction'
import { OFXParser } from '../../../infra/parsers/OFXParser'
import { CSVParser } from '../../../infra/parsers/CSVParser'
import { CategorizationService } from '../../services/CategorizationService'
import { AppError } from '../../errors/AppError'
import { prisma } from '../../../infra/database/prisma'

export interface ImportResult {
  importedCount: number
  skippedCount: number
  importHistory: ImportHistory
}

export interface ParseAndCategorizeResult {
  transactions: ParsedTransaction[]
  aiEnabled: boolean
}

function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  // Prisma unique constraint violation
  if ('code' in err && (err as { code: unknown }).code === 'P2002') return true
  if (err instanceof Error && err.message.includes('external_id')) return true
  return false
}

export class ImportUseCase {
  constructor(
    private importRepo: IImportRepository,
    private accountRepo: IAccountRepository,
    private transactionRepo: ITransactionRepository,
    private categoryRepo: ICategoryRepository,
    private ofxParser: OFXParser,
    private csvParser: CSVParser,
    private categorizationService?: CategorizationService,
  ) {}

  /** Parse file without AI enrichment. */
  async parseAndCategorize(
    fileContent: string,
    fileType: FileType,
  ): Promise<ParseAndCategorizeResult> {
    const parsed = fileType === 'OFX'
      ? this.ofxParser.parse(fileContent)
      : this.csvParser.parse(fileContent)

    return { transactions: parsed, aiEnabled: false }
  }

  /** Enrich already-parsed transactions with AI category suggestions. */
  async categorizeTransactions(
    transactions: ParsedTransaction[],
    userId: string,
  ): Promise<ParsedTransaction[]> {
    if (!this.categorizationService || !this.categorizationService.isEnabled) {
      return transactions
    }

    const categories = await this.categoryRepo.findAllByUser(userId)
    return this.categorizationService.suggestCategories(transactions, categories)
  }

  /** Legacy synchronous parse (kept for backward compat). */
  parseFile(fileContent: string, fileType: FileType): ParsedTransaction[] {
    return fileType === 'OFX'
      ? this.ofxParser.parse(fileContent)
      : this.csvParser.parse(fileContent)
  }

  async importTransactions(
    userId: string,
    accountId: string,
    _fileContent: string,
    filename: string,
    fileType: FileType,
    parsedTransactions: (ParsedTransaction & { categoryId?: string | null })[],
    fileHash?: string,
  ): Promise<ImportResult> {
    const account = await this.accountRepo.findById(accountId, userId)
    if (!account) {
      throw new AppError('Account not found', 404)
    }

    // Only needed for OFX category-name matching fallback (when no categoryId provided)
    const categories = await this.categoryRepo.findAllByUser(userId)

    let importedCount = 0
    let skippedCount = 0

    // Create the history record first so we can link transactions to it
    const totalProcessedEstimate = parsedTransactions.length
    const importHistory = await this.importRepo.createImportHistory({
      userId,
      accountId,
      filename,
      fileType,
      status: 'SUCCESS', // will be updated below
      importedCount: 0,
      skippedCount: 0,
      fileHash,
    })

    for (const pt of parsedTransactions) {
      // Resolve categoryId: explicit choice from user > OFX name match > null
      let resolvedCategoryId: string | null = pt.categoryId ?? null

      if (!resolvedCategoryId && pt.category) {
        const matched = categories.find(
          (c) => c.name.toLowerCase() === pt.category!.toLowerCase(),
        )
        resolvedCategoryId = matched?.id ?? null
      }

      try {
        await prisma.transaction.create({
          data: {
            userId,
            accountId,
            type: pt.type,
            amount: pt.amount,
            description: pt.description,
            date: pt.date,
            categoryId: resolvedCategoryId,
            destinationAccountId: null,
            installment: null,
            totalInstallments: null,
            parentTransactionId: null,
            externalId: pt.externalId,
            importHistoryId: importHistory.id,
          },
        })

        const delta = pt.type === 'income' ? pt.amount : -pt.amount
        await this.accountRepo.updateBalance(accountId, delta)

        importedCount++
      } catch (err) {
        if (isUniqueViolation(err)) {
          skippedCount++
        } else {
          throw err
        }
      }
    }

    void totalProcessedEstimate // suppress unused var warning
    const totalProcessed = importedCount + skippedCount
    const status =
      importedCount === 0 && totalProcessed > 0
        ? 'FAILED'
        : skippedCount > 0
          ? 'PARTIAL'
          : 'SUCCESS'

    // Update the record with final counts and status
    await prisma.importHistory.update({
      where: { id: importHistory.id },
      data: { status, importedCount, skippedCount },
    })

    return { importedCount, skippedCount, importHistory }
  }

  async getHistory(userId: string): Promise<(ImportHistory & { accountName: string })[]> {
    return this.importRepo.findHistoryByUser(userId) as Promise<
      (ImportHistory & { accountName: string })[]
    >
  }

  async getHistoryDetail(id: string, userId: string): Promise<ImportHistoryDetail | null> {
    return this.importRepo.findDetailById(id, userId)
  }

  async getHistoryByAccount(userId: string, accountId: string): Promise<ImportHistory[]> {
    return this.importRepo.findHistoryByAccount(accountId, userId)
  }
}
