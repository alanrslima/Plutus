import { IAIProvider } from '../../domain/services/IAIProvider'
import { ParsedTransaction } from '../../domain/entities/ParsedTransaction'
import { Category } from '../../domain/entities/Category'
import { normalizeDescription } from '../../infra/ai/buildCategorizationPrompt'
import { matchCompany, SKIP_TO_AI } from '../../infra/ai/companyRegistry'
import { createLogger } from '../../infra/logger'

const log = createLogger('CategorizationService')

export class CategorizationService {
  constructor(
    private aiProvider: IAIProvider,
    private batchSize: number = 20,
  ) {}

  get isEnabled(): boolean {
    return this.aiProvider.name !== 'none'
  }

  async suggestCategories(
    transactions: ParsedTransaction[],
    categories: Category[],
  ): Promise<ParsedTransaction[]> {
    if (categories.length === 0 || !this.isEnabled) {
      log.debug({ isEnabled: this.isEnabled, categories: categories.length }, 'Skipping categorization')
      return transactions
    }

    const available = await this.aiProvider.isAvailable()
    if (!available) {
      log.warn({ provider: this.aiProvider.name }, 'Provider unavailable — skipping categorization')
      return transactions
    }

    const categoryOptions = categories
      .filter((c) => c.type !== 'transfer')
      .map((c) => ({ id: c.id, name: c.name, type: c.type }))

    if (categoryOptions.length === 0) return transactions

    // Build a name → id map for deterministic lookups
    const categoryByName = new Map(categoryOptions.map((c) => [c.name, c.id]))

    // ── Phase 1: deterministic pre-pass ──────────────────────────────────
    // Match well-known companies directly from the registry — no AI needed.
    // This is O(n) and 100% reliable for companies in the registry.
    const deterministicSuggestions = new Map<number, string | null>()
    const needsAI: number[] = []

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i]
      const normalized = normalizeDescription(tx.description ?? '')
      const categoryName = matchCompany(normalized)

      if (categoryName && categoryName !== SKIP_TO_AI) {
        const categoryId = categoryByName.get(categoryName) ?? null
        if (categoryId) {
          deterministicSuggestions.set(i, categoryId)
          log.debug({ description: tx.description, categoryName }, 'Deterministic match')
          continue
        }
      } else if (categoryName === SKIP_TO_AI) {
        log.debug({ description: tx.description }, 'Recognized entity — delegating to AI')
      }
      needsAI.push(i)
    }

    log.info(
      {
        provider: this.aiProvider.name,
        total: transactions.length,
        deterministic: deterministicSuggestions.size,
        toAI: needsAI.length,
        batchSize: this.batchSize,
      },
      'Starting categorization',
    )

    // ── Phase 2: AI for unmatched transactions ────────────────────────────
    const aiSuggestions = new Map<number, string | null>()

    if (needsAI.length > 0) {
      const totalBatches = Math.ceil(needsAI.length / this.batchSize)

      for (let b = 0; b < needsAI.length; b += this.batchSize) {
        const batchIndex = Math.floor(b / this.batchSize) + 1
        const batchIndices = needsAI.slice(b, b + this.batchSize)

        const toCategorizeBatch = batchIndices.map((origIdx, localIdx) => {
          const tx = transactions[origIdx]
          return {
            index: localIdx,          // local index within this batch
            description: tx.description ?? '',
            amount: tx.amount,
            type: tx.type,
            date: tx.date instanceof Date ? tx.date.toISOString() : String(tx.date),
          }
        })

        try {
          const results = await this.aiProvider.categorize(toCategorizeBatch, categoryOptions)
          let matched = 0
          for (const result of results) {
            const origIdx = batchIndices[result.index]
            if (origIdx !== undefined) {
              aiSuggestions.set(origIdx, result.categoryId)
              if (result.categoryId) matched++
            }
          }
          log.debug({ batchIndex, totalBatches, matched, total: batchIndices.length }, 'AI batch processed')
        } catch (err) {
          log.warn({ batchIndex, totalBatches, error: (err as Error).message }, 'AI batch failed')
        }
      }
    }

    // ── Merge results: deterministic takes priority over AI ───────────────
    const enriched = transactions.map((tx, i) => {
      const categoryId = deterministicSuggestions.has(i)
        ? deterministicSuggestions.get(i)
        : aiSuggestions.get(i)
      return categoryId !== undefined ? { ...tx, suggestedCategoryId: categoryId } : tx
    })

    const totalMatched =
      [...deterministicSuggestions.values(), ...aiSuggestions.values()].filter(Boolean).length
    log.info(
      {
        provider: this.aiProvider.name,
        total: transactions.length,
        matched: totalMatched,
        deterministic: deterministicSuggestions.size,
        ai: aiSuggestions.size,
      },
      'Categorization complete',
    )

    return enriched
  }
}
