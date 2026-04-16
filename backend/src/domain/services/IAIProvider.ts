export interface TransactionToCategorize {
  index: number
  description: string
  amount: number
  type: 'income' | 'expense'
}

export interface CategoryOption {
  id: string
  name: string
  type: 'income' | 'expense' | 'transfer'
}

export interface CategorizationSuggestion {
  index: number
  categoryId: string | null
}

export interface IAIProvider {
  categorize(
    transactions: TransactionToCategorize[],
    categories: CategoryOption[]
  ): Promise<CategorizationSuggestion[]>
  isAvailable(): Promise<boolean>
  readonly name: string
}
