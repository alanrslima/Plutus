import {
  TransactionToCategorize,
  CategoryOption,
  CategorizationSuggestion,
} from '../../domain/services/IAIProvider'

export function buildSystemPrompt(): string {
  return `You are a financial transaction categorizer for a Brazilian personal finance app.
Assign each transaction to the most appropriate category from the provided list.
Rules:
- Match based on description, amount and type (income/expense).
- Only suggest a category whose type matches the transaction type.
- If no category fits well, use null for categoryId.
- Respond ONLY with a valid JSON array. No explanation, no markdown, no extra text.`
}

export function buildUserPrompt(
  transactions: TransactionToCategorize[],
  categories: CategoryOption[]
): string {
  return `Available categories:
${JSON.stringify(categories)}

Transactions to categorize:
${JSON.stringify(transactions)}

Respond with a JSON array:
${JSON.stringify(transactions.map((t) => ({ index: t.index, categoryId: 'uuid-or-null' })))}`
}

export function parseCategorizationResponse(
  raw: string,
  categories: CategoryOption[]
): CategorizationSuggestion[] {
  try {
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return []

    const parsed = JSON.parse(match[0])

    if (!Array.isArray(parsed)) return []

    const categoryIds = new Set(categories.map((c) => c.id))
    const results: CategorizationSuggestion[] = []

    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) continue
      if (typeof item.index !== 'number') continue
      if (item.categoryId !== null && typeof item.categoryId !== 'string') continue

      const categoryId =
        typeof item.categoryId === 'string' && categoryIds.has(item.categoryId)
          ? item.categoryId
          : null

      results.push({ index: item.index, categoryId })
    }

    return results
  } catch {
    return []
  }
}
