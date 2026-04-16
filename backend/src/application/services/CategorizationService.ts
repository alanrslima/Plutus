import { IAIProvider } from '../../domain/services/IAIProvider'
import { ParsedTransaction } from '../../domain/entities/ParsedTransaction'
import { Category } from '../../domain/entities/Category'

export class CategorizationService {
  constructor(
    private aiProvider: IAIProvider,
    private batchSize: number = 50,
  ) {}

  get isEnabled(): boolean {
    return this.aiProvider.name !== 'none'
  }

  async suggestCategories(
    transactions: ParsedTransaction[],
    categories: Category[],
  ): Promise<ParsedTransaction[]> {
    // Nothing to do without categories or a real provider
    if (categories.length === 0 || !this.isEnabled) {
      return transactions
    }

    const available = await this.aiProvider.isAvailable()
    if (!available) {
      console.warn(`[CategorizationService] Provider "${this.aiProvider.name}" is not available — skipping`)
      return transactions
    }

    // Only income/expense categories are useful for matching (no transfer)
    const categoryOptions = categories
      .filter((c) => c.type !== 'transfer')
      .map((c) => ({ id: c.id, name: c.name, type: c.type }))

    if (categoryOptions.length === 0) {
      return transactions
    }

    // Map externalId → suggestedCategoryId after all batches
    const suggestions = new Map<number, string | null>()

    // Process in batches
    for (let start = 0; start < transactions.length; start += this.batchSize) {
      const batch = transactions.slice(start, start + this.batchSize)

      const toCategorizeBatch = batch.map((tx, i) => ({
        index: start + i,
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
      }))

      try {
        const results = await this.aiProvider.categorize(toCategorizeBatch, categoryOptions)
        for (const result of results) {
          suggestions.set(result.index, result.categoryId)
        }
      } catch (err) {
        console.warn(`[CategorizationService] Batch ${start}–${start + batch.length - 1} failed:`, err)
        // Continue with next batch
      }
    }

    // Attach suggestions back to transactions
    return transactions.map((tx, i) => {
      const categoryId = suggestions.get(i)
      if (categoryId !== undefined) {
        return { ...tx, suggestedCategoryId: categoryId }
      }
      return tx
    })
  }
}
