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

export class OllamaProvider implements IAIProvider {
  readonly name = 'ollama'

  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly timeoutMs: number
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.timeoutMs)
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      })
      clearTimeout(timer)
      return response.status === 200
    } catch {
      return false
    }
  }

  async categorize(
    transactions: TransactionToCategorize[],
    categories: CategoryOption[]
  ): Promise<CategorizationSuggestion[]> {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.timeoutMs)

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: buildSystemPrompt() },
            { role: 'user', content: buildUserPrompt(transactions, categories) },
          ],
          stream: false,
          format: 'json',
        }),
      })

      clearTimeout(timer)

      const data = await response.json() as { message: { content: string } }
      const content: string = data.message.content

      return parseCategorizationResponse(content, categories)
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      console.warn('[OllamaProvider]', error.message)
      return []
    }
  }
}
