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

export class OpenAIProvider implements IAIProvider {
  readonly name = 'openai'

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
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.timeoutMs)

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: buildSystemPrompt() },
            { role: 'user', content: buildUserPrompt(transactions, categories) },
          ],
          temperature: 0,
          response_format: { type: 'json_object' },
        }),
      })

      clearTimeout(timer)

      const data = await response.json() as { choices: Array<{ message: { content: string } }> }
      const content: string = data.choices[0].message.content

      return parseCategorizationResponse(content, categories)
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      console.warn('[OpenAIProvider]', error.message)
      return []
    }
  }
}
