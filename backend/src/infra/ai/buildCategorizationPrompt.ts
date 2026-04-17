import {
  TransactionToCategorize,
  CategoryOption,
  CategorizationSuggestion,
} from '../../domain/services/IAIProvider'

/**
 * Normalize a Brazilian bank description to improve matching:
 * - Remove excessive whitespace and control chars
 * - Lowercase
 * - Strip common prefixes that add no semantic value
 * - Expand common abbreviations
 */
export function normalizeDescription(raw: string): string {
  let s = raw.trim().toLowerCase()

  // Remove extraneous codes at the end (e.g. trailing numbers/dates after spaces)
  s = s.replace(/\s+\d{5,}\s*$/, '')

  // Strip common noise prefixes
  s = s
    .replace(/^compra (debito|credito|cartao)\s*/i, '')
    .replace(/^pgto\s+/i, 'pagamento ')
    .replace(/^pag\s+/i, 'pagamento ')
    .replace(/^transf\s+/i, 'transferencia ')
    .replace(/^dep\s+/i, 'deposito ')
    .replace(/^saque\s+/i, 'saque ')
    .replace(/^ted\s+(credito|debito)?\s*/i, 'ted ')
    .replace(/^doc\s+(credito|debito)?\s*/i, 'doc ')

  // Normalize asterisks used by payment aggregators (e.g. "IFOOD*HAMBURGUERIA" → "ifood hamburgueria")
  s = s.replace(/\*/g, ' ')

  // Collapse multiple spaces
  s = s.replace(/\s{2,}/g, ' ').trim()

  return s
}

// ── Category hint matrix ───────────────────────────────────────────────────
// For each default category, a list of keyword patterns that strongly suggest it.
// Used to enrich the prompt so the model has explicit signal mapping.
const CATEGORY_HINTS: Record<string, string[]> = {
  // Expense
  'Alimentação': [
    'padaria', 'lanchonete', 'cafe', 'cafeteria', 'pastelaria', 'pao de acucar', 'hortifruti',
    'açougue', 'acougue', 'peixaria', 'mercearia', 'frutaria', 'feira', 'quitanda',
  ],
  'Supermercado': [
    // ⚠ "mercado" alone is NEVER enough — check for Mercado Pago / Mercado Livre first
    'supermercado', 'hipermercado', 'atacadao', 'carrefour', 'assai', 'makro',
    'walmart', 'fort atacadista', 'zaffari', 'prezunic', 'sonda', 'nagumo', 'condor',
  ],
  'Restaurante e Delivery': [
    'ifood', 'rappi', 'uber eats', 'mc donalds', 'mcdonalds', 'subway', 'burger king',
    'kfc', 'pizzaria', 'sushi', 'churrascaria', 'restaurante', 'lanchonete', 'hamburgueria',
    'hamburguer', 'pizza', 'delivery', 'bob s', 'bobs', 'china in box', 'giraffas',
    'habib s', 'habibs', 'outback', 'coco bambu', 'applebees', 'dominos', 'patroni',
    'vivenda do camarao',
  ],
  'Moradia': [
    'aluguel', 'condominio', 'condomínio', 'iptu', 'seguro residencial',
    'administradora', 'imobiliaria', 'imóveis', 'imoveis', 'loft', 'quinto andar',
    'vivareal', 'dpe', 'caixa habitacao',
  ],
  'Transporte': [
    'uber', '99pop', '99', 'cabify', 'onibus', 'ônibus', 'metro', 'metrô', 'metro sp',
    'metro rj', 'bilhete unico', 'bilhetagem', 'brt', 'trem', 'cptm', 'supervia',
    'intermunicipal', 'rodoviaria', 'passagem', 'passagem aerea', 'latam', 'gol',
    'azul', 'avianca', 'tam', 'taxi', 'táxi', '99taxi',
  ],
  'Combustível': [
    'posto', 'combustivel', 'gasolina', 'etanol', 'diesel', 'shell', 'petrobras',
    'br distribuidora', 'ale combustiveis', 'ipiranga', 'texaco', 'raizen', 'abastece ai',
    'posto de combustivel',
  ],
  'Saúde': [
    'hospital', 'clinica', 'clínica', 'medico', 'médico', 'consultorio', 'dentista',
    'odonto', 'plano de saude', 'plano saude', 'unimed', 'amil', 'bradesco saude',
    'sulamérica saude', 'hapvida', 'notre dame', 'ultrafarma', 'laboratorio',
    'exame', 'cirurgia', 'pronto socorro', 'upa', 'sus', 'fisioterapia', 'psicólogo',
    'psicologo', 'terapeuta', 'homeopatia',
  ],
  'Farmácia': [
    'farmacia', 'farmácia', 'drogaria', 'drogasil', 'drogaraia', 'droga raia',
    'pacheco', 'nissei', 'ultrafarma', 'panvel', 'pague menos', 'drogas don',
    'dpsp', 'araujo', 'drogafarma', 'coop farmacia',
  ],
  'Educação': [
    'escola', 'faculdade', 'universidade', 'colegio', 'colégio', 'curso',
    'mensalidade escolar', 'mensalidade', 'idiomas', 'ingles', 'inglês', 'espanhol',
    'wizard', 'ccaa', 'yázigi', 'fisk', 'cultura inglesa', 'udemy', 'coursera',
    'alura', 'rocketseat', 'descomplica', 'duolingo', 'material escolar',
    'livraria', 'livro', 'apostila', 'vestibular', 'enem',
  ],
  'Lazer e Entretenimento': [
    'cinema', 'teatro', 'show', 'ingresso', 'ticketmaster', 'sympla', 'eventim',
    'parque', 'zoologico', 'museu', 'aquario', 'festa', 'balada', 'bar',
    'pub', 'jogo', 'steam', 'playstation', 'xbox', 'nintendo', 'psn', 'ps4', 'ps5',
    'xbox live', 'game', 'games', 'nuuvem', 'epic games',
  ],
  'Assinaturas e Streaming': [
    'netflix', 'spotify', 'amazon prime', 'prime video', 'disney', 'hbo max', 'max',
    'globoplay', 'deezer', 'apple tv', 'apple music', 'youtube premium', 'paramount',
    'star plus', 'mubi', 'crunchyroll', 'twitch', 'adobe', 'microsoft 365',
    'office 365', 'google one', 'dropbox', 'icloud', 'linkedin premium',
    'notion', 'canva', 'figma', 'chatgpt', 'openai',
  ],
  'Roupas e Acessórios': [
    'renner', 'c&a', 'riachuelo', 'marisa', 'forever 21', 'zara', 'h&m',
    'hering', 'levis', 'nike', 'adidas', 'puma', 'track field', 'centauro',
    'shein', 'shopee roupa', 'dafiti', 'netshoes roupa', 'roupas', 'vestuario',
    'sapataria', 'calcados', 'calçados', 'arezzo', 'melissa',
  ],
  'Telefone e Internet': [
    'vivo', 'claro', 'tim', 'oi', 'nextel', 'net combo', 'net', 'sky', 'directv',
    'telefonica', 'anatel', 'fatura celular', 'recarga celular', 'internet',
    'banda larga', 'fibra', 'plano celular', 'recarga',
  ],
  'Energia Elétrica': [
    'energia eletrica', 'conta de luz', 'fatura de energia',
    'enel', 'cemig', 'cpfl', 'copel', 'light', 'celesc', 'ceee', 'coelba', 'coelce',
    'celg', 'eletropaulo', 'equatorial', 'neoenergia', 'energisa', 'elektro', 'edp',
    'ceal', 'ceb', 'ceron', 'cosern', 'celtins', 'saelpa', 'celpe', 'cemar',
  ],
  'Água e Saneamento': [
    'agua', 'água', 'conta de agua', 'fatura de agua', 'saneamento', 'abastecimento',
    'sabesp', 'copasa', 'sanepar', 'corsan', 'embasa', 'cagece', 'caesb', 'cedae',
    'saneago', 'compesa', 'caema', 'casan', 'casal', 'caern', 'cagepa', 'deso',
    'cesan', 'sanesul', 'sanemat', 'saneatins', 'cosanpa', 'caesa', 'agespisa',
  ],
  'Academia e Esportes': [
    'academia', 'smartfit', 'bluefit', 'bio ritmo', 'contours', 'crossfit',
    'bodytech', 'fitness', 'spinning', 'natacao', 'natação', 'futebol', 'tenis',
    'tênis', 'beach tennis', 'padel', 'pilates', 'yoga',
  ],
  'Pet': [
    'pet', 'petshop', 'pet shop', 'racao', 'ração', 'cobasi', 'petz',
    'veterinario', 'veterinário', 'clinica veterinaria', 'canil', 'banho e tosa',
    'dogs', 'cats', 'aquário pet',
  ],
  'Viagem': [
    'hotel', 'pousada', 'hostel', 'airbnb', 'booking', 'trivago', 'expedia',
    'hurb', 'decolar', 'cvc', 'passagem', 'aeroporto', 'taxi aeroporto',
    'aluguel carro', 'localiza', 'movida', 'unidas', 'turismo', 'viagem',
    'resort', 'motel',
  ],
  'Impostos e Taxas': [
    'iptu', 'ipva', 'iof', 'imposto', 'taxa', 'dpvat', 'detran', 'multa',
    'cartorio', 'receita federal', 'prefeitura', 'tributo', 'licenciamento',
    'cnd', 'guia de recolhimento', 'darf', 'das mei',
  ],
  // Income
  'Salário': [
    'salario', 'salário', 'folha de pagamento', 'pagamento salario', 'adiantamento salarial',
    '13o salario', 'ferias', 'férias', 'rescisao', 'rescisão', 'proventos',
    'remuneracao', 'remuneração', 'rh pagamento',
  ],
  'Freelance': [
    'freelance', 'autonomo', 'autônomo', 'honorarios', 'honorários', 'prestacao de servico',
    'rps', 'nf servico', 'pagamento servico', 'projeto', 'consultoria',
  ],
  'Investimentos': [
    'rendimento', 'rentabilidade', 'juros', 'resgate', 'aplicacao', 'aplicação',
    'cdb', 'tesouro', 'lci', 'lca', 'fundo', 'acoes', 'ações', 'btg', 'xp investimentos',
    'rico', 'clear', 'nu invest', 'modal', 'inter invest', 'renda fixa', 'renda variavel',
    'cripto', 'bitcoin', 'binance',
  ],
  'Aluguel Recebido': [
    'aluguel recebido', 'receita aluguel', 'locacao recebida', 'renda aluguel',
    'locatario', 'contrato locacao',
  ],
  'Dividendos': [
    'dividendo', 'jscp', 'juros sobre capital', 'proventos acao', 'fii rendimento',
    'fundo imobiliario', 'dividends',
  ],
  'Reembolso': [
    'reembolso', 'estorno', 'devolucao', 'devolução', 'chargeback', 'cashback',
    'restituicao', 'restituição', 'pix estorno',
  ],
  'Presente': [
    'presente', 'gift', 'doacao', 'doação', 'recebido de', 'aniversario',
    'pix presente', 'transferencia presente',
  ],
}

export function buildSystemPrompt(): string {
  return `You are a financial transaction categorizer for a Brazilian personal finance app (Plutos).
Your goal is to match EACH transaction to the MOST SPECIFIC fitting category — "Outros" is a last resort.

━━━ CRITICAL RULES ━━━
1. ONLY assign a category whose "type" matches the transaction "type" ("income" → income category, "expense" → expense category).
2. "Outros (Despesa)" and "Outros (Receita)" must be used ONLY when you have exhausted ALL other options. They represent a failure to categorize — avoid them aggressively.
3. Use EVERY available signal: description keywords, merchant names, amount, and day-of-month.
4. Respond ONLY with a JSON object in exactly this format — no markdown, no extra text:
   {"results": [{"index": <number>, "categoryId": "<uuid>"}]}
5. Every transaction index must appear exactly once in "results".

━━━ DESCRIPTION PATTERNS (Brazilian banks) ━━━
Brazilian bank descriptions are noisy. Look for these patterns:
• "PIX ENVIADO / PIX RECEBIDO + name" → use context of name/amount to decide category
• "COMPRA DEBITO / COMPRA CREDITO + merchant" → look at merchant name
• "IFOOD*", "RAPPI*", "UBER*" → asterisk separates aggregator from merchant
• All-caps merchant names are normal; match case-insensitively
• Trailing codes/numbers after spaces are transaction IDs — ignore them
• "TED CREDITO / DOC CREDITO" for income → check description for salary/freelance clues
• "SALARIO", "PAGTO SALARIO", "FOLHA" → always Salário (income)
• "RENDIMENTO", "RESGATE CDB", "TESOURO" → Investimentos (income)

━━━ DAY-OF-MONTH HEURISTICS ━━━
• Day 1–10: likely rent, condominium, utilities, loan installments
• Day 5, 10, 15, 20, 25, 30: likely salary or regular bill payments
• Any day: delivery apps, streaming, supermarkets can occur anytime

━━━ FINTECHS, BANCOS E E-COMMERCE — ATENÇÃO ━━━
These are NOT supermarkets or food categories:
• MERCADO PAGO → payment platform. Categorize by the underlying service (e.g. "MERCADO PAGO*ENEL" = Energia Elétrica). If context is unclear → Outros.
• MERCADO LIVRE → e-commerce marketplace, NOT a supermarket. Infer from context or use Outros.
• PICPAY, PAGSEGURO, UOLPAG → payment platforms → Outros unless context reveals the real merchant.
• NUBANK, INTER, BANCO INTER, C6 BANK, NEON → banks/fintechs. "FATURA NUBANK" is a credit card payment → Outros.
• STONE, CIELO, GETNET, REDE → payment terminals / acquirers → Outros (usually merchant fees).
• PAYPAL, WISE → international payments → look at merchant if present; else Outros.
• AMAZON → if "AMAZON PRIME" or "AMAZON MUSIC" → Assinaturas e Streaming. Otherwise e-commerce → Outros.
• SHOPEE, SHEIN, ALIEXPRESS → e-commerce → infer from description or Outros.
• AMERICANAS, MAGAZINE LUIZA, MAGALU, CASAS BAHIA → retail stores → infer from description or Outros.
• CAIXA ECONÔMICA, BANCO BRADESCO, ITAÚ, SANTANDER → banks → Outros.

RULE: "MERCADO" alone in a description does NOT mean supermarket. Always check if it's part of "MERCADO PAGO" or "MERCADO LIVRE" before assuming supermarket.

━━━ UTILITY COMPANIES — NEVER CONFUSE THESE ━━━
ÁGUA E SANEAMENTO (water/sewage companies — NOT electricity):
  SABESP (SP), COPASA (MG), SANEPAR (PR), CORSAN (RS), EMBASA (BA), CAGECE (CE),
  CAESB (DF), CEDAE (RJ), SANEAGO (GO), COMPESA (PE), CAEMA (MA), CASAN (SC),
  CASAL (AL), CAERN (RN), CAGEPA (PB), DESO (SE), CESAN (ES), SANESUL (MS),
  SANEMAT (MT), SANEATINS (TO), COSANPA (PA), CAESA (AP), AGESPISA (PI), CAER (RR)
  → Key rule: names starting with SANE*, CAGE*, CESA*, CASA*, EMBA* are WATER companies.

ENERGIA ELÉTRICA (electricity — NOT water):
  ENEL (SP/RJ/CE/GO/AM), CEMIG (MG), COPEL (PR), LIGHT (RJ), CPFL (SP/RS/MG),
  CELESC (SC), COELBA (BA), COELCE (CE), CELG (GO), CEEE (RS), EQUATORIAL (MA/PA/AL/PI),
  NEOENERGIA (BA/PB/PE/DF), ENERGISA (various), ELETROPAULO (SP), RGE (RS),
  COSERN (RN), CEAL (AL), CELPE (PE), CERON (RO), CELTINS (TO), SAELPA (PB)
  → Key rule: COPEL≠COPASA (COPEL=electricity PR, COPASA=water MG). CELG=electricity GO, SANEAGO=water GO.

━━━ COMMON BRAZILIAN MERCHANTS BY CATEGORY ━━━
Alimentação: padaria, cafeteria, hortifruti, açougue, feira, mercearia, panificadora
Supermercado: carrefour, extra, assaí, atacadão, makro, zaffari, pão de açúcar, fort, walmart, condor, bahamas
Restaurante e Delivery: ifood, rappi, uber eats, mcdonalds, burger king, subway, dominos, pizzaria, restaurante, churrascaria
Moradia: aluguel, condomínio, iptu, imobiliária, administradora, seguro residencial
Transporte: uber, 99pop, cabify, metro, ônibus, bilhete único, cptm, supervia, taxi, buser
Combustível: posto, ipiranga, shell, petrobras, br distribuidora, gasolina, etanol, raízen
Saúde: hospital, clínica, médico, consultório, plano de saúde, unimed, amil, hapvida, exame, cirurgia
Farmácia: drogasil, droga raia, pacheco, nissei, ultrafarma, panvel, pague menos, farmácia, drogaria
Educação: escola, faculdade, curso, mensalidade, idiomas, wizard, ccaa, alura, udemy, livraria, material escolar
Lazer e Entretenimento: cinema, teatro, show, ingresso, bar, balada, steam, playstation, xbox, game
Assinaturas e Streaming: netflix, spotify, amazon prime, disney+, hbo max, globoplay, deezer, adobe, microsoft 365, chatgpt
Roupas e Acessórios: renner, riachuelo, c&a, zara, nike, adidas, dafiti, shein, sapataria, calçados
Telefone e Internet: vivo, claro, tim, oi, net, sky, recarga celular, fatura celular, internet, fibra, banda larga
Energia Elétrica: enel, cemig, cpfl, copel, light, coelba, celesc, neoenergia, equatorial, energisa, conta de luz
Água e Saneamento: sabesp, copasa, sanepar, corsan, embasa, saneago, caesb, cedae, compesa, água, saneamento
Academia e Esportes: academia, smartfit, bluefit, bodytech, crossfit, pilates, yoga, natação, beach tennis, padel
Pet: petshop, cobasi, petz, veterinário, ração, banho e tosa
Viagem: hotel, airbnb, booking, localiza, movida, cvc, decolar, aeroporto, pousada
Impostos e Taxas: ipva, iptu, iof, detran, dpvat, multa, receita federal, guia, darf, das mei, sefaz
Salário: salário, folha, pagamento, adiantamento, 13o, férias, rescisão, proventos
Freelance: freelance, autônomo, honorários, prestação de serviço, consultoria, rps
Investimentos: rendimento, resgate, cdb, tesouro, lci, fundo, ações, btg, xp, nu invest, renda fixa
Aluguel Recebido: aluguel recebido, receita aluguel, locação recebida
Dividendos: dividendo, jscp, juros sobre capital, fii rendimento, proventos ação
Reembolso: estorno, reembolso, devolução, chargeback, cashback, restituição
Presente: presente, doação, gift`
}

export function buildUserPrompt(
  transactions: TransactionToCategorize[],
  categories: CategoryOption[],
): string {
  // Attach keyword hints inline to each category so the model has them at decision time
  const categoryList = categories
    .map((c) => {
      const hints = CATEGORY_HINTS[c.name]
      const hintStr = hints && hints.length > 0
        ? ` [keywords: ${hints.slice(0, 12).join(', ')}]`
        : ''
      return `  {"id": "${c.id}", "name": "${c.name}", "type": "${c.type}"${hintStr}}`
    })
    .join('\n')

  const txList = transactions
    .map((t) => {
      const normalized = normalizeDescription(t.description)
      const dayOfMonth = t.date ? new Date(t.date).getDate() : null
      const dayLabel = dayOfMonth ? `, "day": ${dayOfMonth}` : ''
      // Include both original and normalized so the model can see the raw signal too
      const descField = normalized !== t.description.toLowerCase().trim()
        ? `"description": "${escapeJson(normalized)}", "raw": "${escapeJson(t.description)}"`
        : `"description": "${escapeJson(normalized)}"`
      return `  {"index": ${t.index}, ${descField}, "amount": ${t.amount}, "type": "${t.type}"${dayLabel}}`
    })
    .join('\n')

  return `Available categories (use "id" in your response):
[
${categoryList}
]

Transactions to categorize (match each to the best category — avoid "Outros" unless truly necessary):
[
${txList}
]

Respond with JSON object — every index must appear once:
{"results": [{"index": 0, "categoryId": "<uuid>"}, ...]}`
}

function escapeJson(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export function parseCategorizationResponse(
  raw: string,
  categories: CategoryOption[],
): CategorizationSuggestion[] {
  try {
    const categoryIds = new Set(categories.map((c) => c.id))

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      const objMatch = raw.match(/\{[\s\S]*\}/)
      const arrMatch = raw.match(/\[[\s\S]*\]/)
      if (objMatch) {
        parsed = JSON.parse(objMatch[0])
      } else if (arrMatch) {
        parsed = JSON.parse(arrMatch[0])
      } else {
        return []
      }
    }

    let items: unknown[]
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      Array.isArray((parsed as Record<string, unknown>).results)
    ) {
      items = (parsed as Record<string, unknown>).results as unknown[]
    } else if (Array.isArray(parsed)) {
      items = parsed
    } else {
      return []
    }

    const results: CategorizationSuggestion[] = []

    for (const item of items) {
      if (typeof item !== 'object' || item === null) continue
      const entry = item as Record<string, unknown>
      if (typeof entry.index !== 'number') continue

      const categoryId =
        typeof entry.categoryId === 'string' && categoryIds.has(entry.categoryId)
          ? entry.categoryId
          : null

      results.push({ index: entry.index, categoryId })
    }

    return results
  } catch {
    return []
  }
}
