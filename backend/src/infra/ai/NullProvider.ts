import {
  IAIProvider,
  TransactionToCategorize,
  CategoryOption,
  CategorizationSuggestion,
} from '../../domain/services/IAIProvider'

export class NullProvider implements IAIProvider {
  readonly name = 'none'

  async categorize(
    _transactions: TransactionToCategorize[],
    _categories: CategoryOption[]
  ): Promise<CategorizationSuggestion[]> {
    return []
  }

  async isAvailable(): Promise<boolean> {
    return false
  }
}
