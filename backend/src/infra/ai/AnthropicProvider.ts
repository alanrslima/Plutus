import Anthropic from '@anthropic-ai/sdk'
import {
  IAIProvider,
  TransactionToCategorize,
  CategoryOption,
  CategorizationSuggestion,
} from '../../domain/services/IAIProvider'
import {
  buildSystemPrompt,
  buildUserPrompt,
  parseCategorizationResponse,
} from './buildCategorizationPrompt'

export class AnthropicProvider implements IAIProvider {
  readonly name = 'anthropic'

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly timeoutMs: number
  ) {}

  async isAvailable(): Promise<boolean> {
    return this.apiKey.length > 0
  }

  async categorize(
    transactions: TransactionToCategorize[],
    categories: CategoryOption[]
  ): Promise<CategorizationSuggestion[]> {
    try {
      const client = new Anthropic({ apiKey: this.apiKey })

      const response = await client.messages.create({
        model: this.model,
        max_tokens: 2048,
        system: buildSystemPrompt(),
        messages: [
          { role: 'user', content: buildUserPrompt(transactions, categories) },
        ],
      })

      const block = response.content[0]
      if (block.type !== 'text') return []

      return parseCategorizationResponse(block.text, categories)
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      console.warn('[AnthropicProvider]', error.message)
      return []
    }
  }
}
