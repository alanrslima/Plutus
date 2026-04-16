# Categorização Automática via IA — Plano de Implementação

## Grafo de Dependências

```
Fase 1: Documentação                    ← concluída
         │
         ▼
Fase 2A: Backend — Camada de IA         ┐ paralelas (independentes)
Fase 2B: Frontend — Types + Hook        ┘
         │
         ▼
Fase 3:  Backend — CategorizationService  ← depende de 2A
         │
         ▼
Fase 4:  Backend — Integração com Import  ← depende de 3
         │
         ▼
Fase 5A: Backend — Controller/Routes    ┐ paralelas
Fase 5B: Frontend — Página de Import    ┘ depende de 4 / 2B
```

---

## Fase 2A — Backend: Camada de IA

### 2A.1 Interface do provedor

**`backend/src/domain/services/IAIProvider.ts`**
- Exportar tipos: `TransactionToCategorize`, `CategoryOption`, `CategorizationSuggestion`
- Exportar interface: `IAIProvider` com métodos `categorize`, `isAvailable`, `name`

### 2A.2 NullProvider

**`backend/src/infra/ai/NullProvider.ts`**
- Implementa `IAIProvider`
- `categorize()` → retorna `[]`
- `isAvailable()` → retorna `false`
- `name` → `'none'`
- Usado quando `AI_PROVIDER` não está definido

### 2A.3 OllamaProvider

**`backend/src/infra/ai/OllamaProvider.ts`**
- Constructor: `baseUrl` (default `http://localhost:11434`), `model` (default `llama3.2`), `timeoutMs`
- `isAvailable()`: GET `{baseUrl}/api/tags` — retorna true se HTTP 200
- `categorize()`:
  1. Montar system prompt + user prompt com JSON das transações e categorias
  2. POST `{baseUrl}/api/chat` com `{ model, messages, stream: false, format: 'json' }`
  3. Extrair `response.message.content`
  4. Parsear JSON com regex `\[[\s\S]*\]`
  5. Mapear para `CategorizationSuggestion[]`
  6. Em qualquer erro: logar e retornar `[]`

### 2A.4 OpenAIProvider

**`backend/src/infra/ai/OpenAIProvider.ts`**
- Constructor: `apiKey`, `model` (default `gpt-4o-mini`), `timeoutMs`
- Usa `fetch` nativo (Node 18+) — sem dependência adicional
- POST `https://api.openai.com/v1/chat/completions`
  - Headers: `Authorization: Bearer {apiKey}`, `Content-Type: application/json`
  - Body: `{ model, messages, response_format: { type: 'json_object' }, temperature: 0 }`
- Extrai `choices[0].message.content`, parseia JSON
- Em qualquer erro: logar e retornar `[]`

### 2A.5 AnthropicProvider

**`backend/src/infra/ai/AnthropicProvider.ts`**
- Constructor: `apiKey`, `model` (default `claude-haiku-4-5-20251001`), `timeoutMs`
- Usa `@anthropic-ai/sdk` (já listado como possível dep)
- Chama `client.messages.create({ model, max_tokens: 1024, system, messages })`
- Extrai `response.content[0].text`, parseia JSON
- Em qualquer erro: logar e retornar `[]`

### 2A.6 Factory

**`backend/src/infra/ai/AIProviderFactory.ts`**
```typescript
static create(): IAIProvider {
  switch (process.env.AI_PROVIDER?.toLowerCase()) {
    case 'ollama':    return new OllamaProvider(baseUrl, model, timeout)
    case 'openai':    return new OpenAIProvider(apiKey, model, timeout)
    case 'anthropic': return new AnthropicProvider(apiKey, model, timeout)
    default:          return new NullProvider()
  }
}
```

### 2A.7 Prompt builder (helper)

**`backend/src/infra/ai/buildCategorizationPrompt.ts`**
- `buildSystemPrompt()` → string com instruções fixas
- `buildUserPrompt(transactions, categories)` → string com JSON embutido
- `parseCategorizationResponse(raw, categories)` → `CategorizationSuggestion[]`
  - Extrai JSON com regex
  - Valida que cada `categoryId` existe na lista fornecida
  - Itens inválidos retornam `{ index, categoryId: null }`

---

## Fase 2B — Frontend: Types + Hook

### 2B.1 Atualizar `frontend/src/types/index.ts`

Adicionar `suggestedCategoryId?: string | null` em `ParsedTransaction`.

Atualizar `ImportPreviewResult`:
```typescript
export interface ImportPreviewResult {
  transactions: ParsedTransaction[]
  total: number
  fileType: FileType
  aiEnabled: boolean   // novo campo
}
```

Atualizar o item do array em `useConfirmImport` para incluir `categoryId?: string | null`.

### 2B.2 Atualizar `frontend/src/hooks/useImport.ts`

O hook `useConfirmImport` já envia `transactions[]`. Garantir que o tipo do payload inclua `categoryId` opcional em cada transação.

---

## Fase 3 — Backend: CategorizationService

**`backend/src/application/services/CategorizationService.ts`**

Esta classe é a única que conhece tanto o `IAIProvider` quanto o `ICategoryRepository`. Encapsula toda a lógica de sugestão.

```typescript
export class CategorizationService {
  constructor(
    private aiProvider: IAIProvider,
    private batchSize: number = 50
  ) {}

  async suggestCategories(
    transactions: ParsedTransaction[],
    categories: Category[]
  ): Promise<ParsedTransaction[]>
}
```

Lógica de `suggestCategories`:
1. Se não há categorias do usuário → retornar transactions sem alteração
2. Se `aiProvider` é `NullProvider` → retornar transactions sem alteração
3. Verificar disponibilidade: `aiProvider.isAvailable()` — se false, logar e retornar sem alteração
4. Filtrar categorias relevantes (só `income` e `expense`, excluir `transfer`)
5. Dividir transactions em lotes de `batchSize`
6. Para cada lote: chamar `aiProvider.categorize(lote, categorias)`
7. Mapear sugestões de volta às transactions (pelo `index`)
8. Retornar transactions com `suggestedCategoryId` preenchido
9. Capturar qualquer exceção por lote → logar, continuar com lotes restantes

---

## Fase 4 — Backend: Integração com ImportUseCase

**Modificar `backend/src/application/use-cases/import/ImportUseCase.ts`**

### 4.1 Constructor

Adicionar parâmetro opcional:
```typescript
constructor(
  private importRepo: IImportRepository,
  private accountRepo: IAccountRepository,
  private transactionRepo: ITransactionRepository,
  private categoryRepo: ICategoryRepository,
  private ofxParser: OFXParser,
  private csvParser: CSVParser,
  private categorizationService?: CategorizationService  // opcional
)
```

### 4.2 Método `parseFile` → renomear para `parseAndCategorize`

Novo método que retorna `{ transactions: ParsedTransaction[], aiEnabled: boolean }`:

```typescript
async parseAndCategorize(
  fileContent: string,
  fileType: FileType,
  userId: string
): Promise<{ transactions: ParsedTransaction[], aiEnabled: boolean }>
```

1. Parsear arquivo → `ParsedTransaction[]`
2. Buscar categorias do usuário: `categoryRepo.findAllByUser(userId)`
3. Se `categorizationService` existir: chamar `suggestCategories`
4. Retornar transactions + `aiEnabled: !!categorizationService && aiProvider !== NullProvider`

### 4.3 Método `importTransactions`

Nenhuma alteração na assinatura, mas agora aceita `categoryId` no objeto de transação (já estava no schema, só garantir que é passado corretamente).

---

## Fase 5A — Backend: Controller e Rotas

**Modificar `backend/src/interfaces/controllers/ImportController.ts`**

### 5A.1 Instanciar `CategorizationService`

No constructor do controller:
```typescript
const aiProvider = AIProviderFactory.create()
const categorizationService = new CategorizationService(aiProvider, batchSize)
// Passar para ImportUseCase
```

### 5A.2 Atualizar `parsePreview`

- Chamar `useCase.parseAndCategorize(content, fileType, userId)` em vez de `parseFile`
- Retornar `{ transactions, total, fileType, aiEnabled }`

### 5A.3 Atualizar `confirmImport`

- Aceitar `categoryId` em cada transação do body (adicionar ao schema Zod)
- Passar `categoryId` para `importTransactions`

---

## Fase 5B — Frontend: Atualizar ImportPage

**Modificar `frontend/src/pages/import/ImportPage.tsx`**

### 5B.1 Coluna Categoria no preview

- Adicionar coluna "Categoria" à tabela de preview
- Renderizar `<Select>` com opções das categorias do usuário (buscar via `useCategories()`)
- Pré-selecionar `suggestedCategoryId` quando disponível
- Gerenciar estado local `categorySelections: Record<string, string | null>` — chave = externalId

### 5B.2 Badge "IA"

- Quando `aiEnabled === true`, mostrar badge ao lado do header "Categoria"

### 5B.3 Botão "Aceitar todas sugestões"

- Aparece quando `aiEnabled === true` e há pelo menos uma sugestão
- Preenche `categorySelections` com todas as sugestões de uma vez

### 5B.4 Envio do confirm

- Incluir `categoryId` de `categorySelections[tx.externalId]` no payload

---

## Fase 6 — Variáveis de Ambiente e Dependências

### 6.1 Atualizar `.env.example`

```env
# IA — Categorização Automática
AI_PROVIDER=none           # none | ollama | openai | anthropic
AI_BATCH_SIZE=50
AI_TIMEOUT_MS=30000

# Ollama (local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# Anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
```

### 6.2 Dependências a instalar

```bash
npm install @anthropic-ai/sdk
```
OpenAI e Ollama usam `fetch` nativo — sem dependência adicional.

---

## Checklist

### Backend
- [ ] 2A.1 `domain/services/IAIProvider.ts`
- [ ] 2A.2 `infra/ai/NullProvider.ts`
- [ ] 2A.3 `infra/ai/OllamaProvider.ts`
- [ ] 2A.4 `infra/ai/OpenAIProvider.ts`
- [ ] 2A.5 `infra/ai/AnthropicProvider.ts`
- [ ] 2A.6 `infra/ai/AIProviderFactory.ts`
- [ ] 2A.7 `infra/ai/buildCategorizationPrompt.ts`
- [ ] 3. `application/services/CategorizationService.ts`
- [ ] 4. Atualizar `ImportUseCase.ts`
- [ ] 5A. Atualizar `ImportController.ts`
- [ ] 6.1 Atualizar `.env.example`
- [ ] 6.2 Instalar `@anthropic-ai/sdk`

### Frontend
- [ ] 2B.1 Atualizar `types/index.ts`
- [ ] 2B.2 Atualizar `hooks/useImport.ts`
- [ ] 5B. Atualizar `pages/import/ImportPage.tsx`
