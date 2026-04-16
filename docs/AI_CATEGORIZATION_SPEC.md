# Categorização Automática de Transações via IA — Especificação

## 1. Visão Geral

Durante a importação de extratos (OFX/CSV), cada transação recebe uma **sugestão de categoria** gerada por um modelo de linguagem (LLM). A sugestão é exibida no preview antes da confirmação, permitindo que o usuário aceite, ajuste ou ignore.

O sistema é desenhado para ser **agnóstico de provedor**: a troca de Ollama → OpenAI → Anthropic (ou qualquer outro) requer apenas uma variável de ambiente, sem alteração de código de negócio.

---

## 2. Fluxo Completo

```
Upload do arquivo
      │
      ▼
   Parsing (OFX/CSV)
      │  → Lista de ParsedTransaction[]
      ▼
Categorização por IA          ← NOVA ETAPA
      │  → ParsedTransaction[] com suggestedCategoryId preenchido
      ▼
Preview no frontend
      │  → Usuário vê tabela com categoria pré-selecionada
      │  → Pode alterar categoria de qualquer transação via dropdown
      ▼
Confirmação (POST /import/confirm)
      │  → ParsedTransaction[] com categoryId final (escolha do usuário)
      ▼
Persistência no banco
```

---

## 3. Abstração de Provedor

### 3.1 Interface `IAIProvider`

```typescript
// domain/services/IAIProvider.ts

export interface TransactionToCategorizе {
  index: number          // posição na lista, para correlacionar resposta
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
  categoryId: string | null   // null = sem sugestão
}

export interface IAIProvider {
  /**
   * Dado um lote de transações e as categorias disponíveis do usuário,
   * retorna uma sugestão de categoria para cada transação.
   * Deve ser tolerante a falhas: erros parciais não interrompem a importação.
   */
  categorize(
    transactions: TransactionToCategorizе[],
    categories: CategoryOption[]
  ): Promise<CategorizationSuggestion[]>

  /** Verifica se o provedor está acessível (ex: Ollama rodando). */
  isAvailable(): Promise<boolean>

  /** Nome do provedor para logs e debug. */
  readonly name: string
}
```

### 3.2 Implementações

| Provedor | Classe | Protocolo |
|---|---|---|
| Ollama (local) | `OllamaProvider` | HTTP REST `localhost:11434` |
| OpenAI | `OpenAIProvider` | HTTPS `api.openai.com` |
| Anthropic (Claude) | `AnthropicProvider` | SDK `@anthropic-ai/sdk` |
| Desabilitado | `NullProvider` | Retorna `[]` imediatamente |

### 3.3 Factory

`AIProviderFactory.create()` lê `AI_PROVIDER` do ambiente e instancia o provedor correto. Se a variável não estiver definida ou for `none`, retorna `NullProvider`.

```typescript
// infra/ai/AIProviderFactory.ts
export class AIProviderFactory {
  static create(): IAIProvider {
    switch (process.env.AI_PROVIDER) {
      case 'ollama':     return new OllamaProvider(...)
      case 'openai':     return new OpenAIProvider(...)
      case 'anthropic':  return new AnthropicProvider(...)
      default:           return new NullProvider()
    }
  }
}
```

---

## 4. Estratégia de Prompt

### 4.1 Processamento em lote

Todas as transações do arquivo são enviadas em **uma única chamada** ao LLM para minimizar latência e custo. O limite de lote é configurável via `AI_BATCH_SIZE` (padrão: 50).

### 4.2 Estrutura do prompt (system + user)

**System:**
```
You are a financial transaction categorizer for a Brazilian personal finance app.
Your task is to assign each transaction to one of the provided categories.
Rules:
- Match based on the transaction description and type (income/expense).
- If no category fits well, return null.
- Respond ONLY with a valid JSON array. No explanation, no markdown.
```

**User:**
```
Available categories:
[{"id":"uuid-1","name":"Alimentação","type":"expense"},{"id":"uuid-2","name":"Salário","type":"income"},...]

Transactions to categorize:
[{"index":0,"description":"Dm *Spotify","amount":31.90,"type":"expense"},{"index":1,"description":"SALARIO EMPRESA XYZ","amount":5000,"type":"income"},...]

Respond with:
[{"index":0,"categoryId":"uuid-X"},{"index":1,"categoryId":"uuid-Y"},...]
Use null for categoryId when no category fits.
```

### 4.3 Parsing da resposta

A resposta é extraída com regex `\[.*\]` (dotall) para ser robusta contra modelos que adicionam texto extra. Se o parsing falhar, a categorização retorna vazia (sem bloquear a importação).

---

## 5. Configuração por Provedor

### Variáveis de Ambiente

```env
# Qual provedor usar: ollama | openai | anthropic | none (padrão)
AI_PROVIDER=ollama

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-4-5-20251001

# Geral
AI_BATCH_SIZE=50           # máximo de transações por chamada
AI_TIMEOUT_MS=30000        # timeout por chamada (30s)
```

### Recomendações de modelo por provedor

| Provedor | Modelo recomendado | Custo | Qualidade |
|---|---|---|---|
| Ollama | `llama3.2` ou `gemma3` | Gratuito | Boa |
| OpenAI | `gpt-4o-mini` | ~$0.15/1M tokens | Excelente |
| Anthropic | `claude-haiku-4-5-20251001` | ~$0.25/1M tokens | Excelente |

---

## 6. Alterações no Modelo de Dados

### 6.1 `ParsedTransaction` (domínio transiente)

Adicionar campo opcional:
```typescript
suggestedCategoryId?: string | null
```

### 6.2 Nenhuma alteração no banco

A sugestão é transiente — existe apenas no fluxo preview→confirm. O `categoryId` final já é salvo na tabela `transactions` existente.

---

## 7. Alterações de API

### POST `/import/preview` — resposta estendida

```json
{
  "transactions": [
    {
      "externalId": "abc123",
      "date": "2026-03-28",
      "amount": 31.90,
      "type": "expense",
      "description": "Dm *Spotify",
      "category": "Streaming",
      "suggestedCategoryId": "uuid-categoria-streaming"
    }
  ],
  "total": 21,
  "fileType": "CSV",
  "aiEnabled": true
}
```

### POST `/import/confirm` — corpo estendido

O frontend já envia `transactions[]`. Cada item agora pode incluir `categoryId` (escolha final do usuário, que pode ser a sugestão ou outra):

```json
{
  "accountId": "uuid",
  "filename": "Extrato.csv",
  "fileType": "CSV",
  "transactions": [
    {
      "externalId": "abc123",
      "date": "2026-03-28T00:00:00.000Z",
      "amount": 31.90,
      "type": "expense",
      "description": "Dm *Spotify",
      "categoryId": "uuid-categoria-streaming"
    }
  ]
}
```

---

## 8. Alterações no Frontend

### 8.1 Coluna de Categoria no Preview

A tabela de preview ganha uma coluna **Categoria** com um `<Select>` pré-preenchido com `suggestedCategoryId`. O usuário pode:
- Aceitar a sugestão (já está selecionada)
- Trocar por outra categoria
- Deixar sem categoria (opção "Sem categoria")

### 8.2 Indicador Visual de IA

Quando `aiEnabled === true`, um badge "IA" aparece ao lado do título da coluna Categoria, indicando que as sugestões foram geradas automaticamente.

### 8.3 Botão "Aceitar todas as sugestões"

Ação de conveniência para aceitar todas as categorias sugeridas de uma vez.

---

## 9. Tratamento de Erros e Degradação Graciosa

| Cenário | Comportamento |
|---|---|
| `AI_PROVIDER=none` ou não definido | Import funciona normalmente sem sugestões |
| Ollama não está rodando | Log de aviso, import prossegue sem sugestões |
| Timeout da chamada ao LLM | Log de aviso, import prossegue sem sugestões |
| Resposta JSON inválida do LLM | Log de aviso, import prossegue sem sugestões |
| Categoria sugerida não existe no banco | Sugestão ignorada para aquela transação |

A regra fundamental: **a IA nunca bloqueia a importação**.

---

## 10. Segurança

- As chaves de API (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) ficam apenas no backend, nunca expostas ao frontend.
- O Ollama roda localmente — nenhum dado bancário sai da máquina do usuário.
- As descrições das transações são os únicos dados enviados ao LLM (sem CPF, saldo, dados pessoais).
