/**
 * Deterministic company → category name registry.
 *
 * Keys are lowercase, accent-free tokens (or multi-word phrases) that appear
 * in Brazilian bank descriptions.
 * Values:
 *   string  → deterministic category name (DEFAULT_CATEGORIES name)
 *   null    → recognized entity with no deterministic category (e.g. fintechs,
 *             e-commerce platforms, banks) — transaction goes to AI with
 *             proper context rather than being matched to the wrong category.
 *
 * Matching (see matchCompany):
 *   1. Multi-word phrases are checked FIRST to prevent partial matches
 *      (e.g. "mercado pago" is caught before "mercado" → Supermercado).
 *   2. Single tokens are checked after.
 *   3. If a null entry is matched, SKIP_TO_AI is returned so the AI handles
 *      it with the benefit of the disambiguation section in the system prompt.
 */

export const SKIP_TO_AI = '__skip__' as const
export type MatchResult = string | typeof SKIP_TO_AI | null

// null values = "we know what this is but cannot categorize it deterministically"
const COMPANY_REGISTRY: Record<string, string | null> = {

  // ════════════════════════════════════════════════════════════════════════
  // FINTECHS, BANCOS E PLATAFORMAS DE PAGAMENTO  →  null (→ AI)
  // These must come as multi-word keys so they are checked BEFORE single
  // tokens like "mercado", "inter", "livre", etc. that could false-match.
  // ════════════════════════════════════════════════════════════════════════

  // Mercado
  'mercado pago':   null,   // payment platform — NOT a supermarket
  'mercado livre':  null,   // e-commerce — NOT a supermarket
  'mercado credito': null,

  // Nubank / Nu
  'nu pagamentos':  null,
  'nu financeira':  null,

  // PicPay
  'picpay servicos': null,

  // PagSeguro / UOL
  'pagseguro':      null,
  'uolpag':         null,

  // iFood Pay / iFood Financial
  'ifood pay':      null,
  'ifood financial': null,

  // Banco Inter
  'banco inter':    null,

  // Caixa
  'caixa economica': null,
  'caixa federal':   null,

  // Bradesco
  'banco bradesco': null,

  // Itaú
  'banco itau':     null,
  'itau unibanco':  null,

  // Santander
  'banco santander': null,

  // BTG
  'btg pactual':    null,

  // C6
  'c6 bank':        null,

  // Neon
  'banco neon':     null,

  // Sicredi / Sicoob
  'sicredi':        null,
  'sicoob':         null,

  // Stone / Ton
  'stone pagamentos': null,
  'ton pagamentos':   null,

  // Cielo / Rede / GetNet
  'cielo':          null,
  'rede adquirente': null,
  'getnet':         null,

  // Pagar.me / Stripe
  'pagarme':        null,
  'stripe':         null,

  // PayPal / Wise
  'paypal':         null,
  'wise':           null,

  // Amazon Pay (distinct from Amazon e-commerce / Prime)
  'amazon pay':     null,

  // Shopee Pay
  'shopee pay':     null,

  // Cartão de crédito payments (descriptions like "PAGTO CARTAO NUBANK")
  'pagto cartao':   null,
  'pagamento cartao': null,
  'fatura cartao':  null,
  'fatura nubank':  null,
  'fatura itau':    null,
  'fatura bradesco': null,
  'fatura santander': null,

  // ════════════════════════════════════════════════════════════════════════
  // E-COMMERCE / MARKETPLACES  →  null (→ AI)
  // Purchased items vary — AI will infer from context or use Outros.
  // ════════════════════════════════════════════════════════════════════════
  'mercado livre shop': null,
  'shopee':            null,
  'shein':             null,    // also appears in CATEGORY_HINTS for Roupas
  'aliexpress':        null,
  'americanas':        null,    // retail — AI can sometimes infer category
  'lojas americanas':  null,
  'magazine luiza':    null,
  'magalu':            null,
  'casas bahia':       null,
  'ponto frio':        null,
  'extra':             null,    // can be supermarket OR e-commerce — let AI decide
  'submarino':         null,
  'kabum':             null,    // electronics
  'terabyte':          null,    // electronics
  'amazon':            null,    // could be Prime, AWS, or e-commerce

  // ════════════════════════════════════════════════════════════════════════
  // ÁGUA E SANEAMENTO
  // ════════════════════════════════════════════════════════════════════════
  'saneamento': 'Água e Saneamento',
  'esgoto':     'Água e Saneamento',
  'sabesp':     'Água e Saneamento',  // SP
  'semae':      'Água e Saneamento',  // SP (municipalities)
  'samae':      'Água e Saneamento',
  'sanasa':     'Água e Saneamento',
  'daee':       'Água e Saneamento',
  'copasa':     'Água e Saneamento',  // MG
  'dmae':       'Água e Saneamento',  // MG/RS municipalities
  'cedae':      'Água e Saneamento',  // RJ
  'corsan':     'Água e Saneamento',  // RS
  'sanepar':    'Água e Saneamento',  // PR
  'casan':      'Água e Saneamento',  // SC
  'embasa':     'Água e Saneamento',  // BA
  'cagece':     'Água e Saneamento',  // CE
  'compesa':    'Água e Saneamento',  // PE
  'caema':      'Água e Saneamento',  // MA
  'saneago':    'Água e Saneamento',  // GO ← reported bug fix
  'caesb':      'Água e Saneamento',  // DF
  'cagepa':     'Água e Saneamento',  // PB
  'casal':      'Água e Saneamento',  // AL
  'caern':      'Água e Saneamento',  // RN
  'deso':       'Água e Saneamento',  // SE
  'saneatins':  'Água e Saneamento',  // TO
  'sanesul':    'Água e Saneamento',  // MS
  'sanemat':    'Água e Saneamento',  // MT
  'cosanpa':    'Água e Saneamento',  // PA
  'cosama':     'Água e Saneamento',  // AM
  'caesa':      'Água e Saneamento',  // AP
  'agespisa':   'Água e Saneamento',  // PI
  'cesan':      'Água e Saneamento',  // ES
  'caerd':      'Água e Saneamento',  // RO
  'caer':       'Água e Saneamento',  // RR
  'depasa':     'Água e Saneamento',  // AC

  // ════════════════════════════════════════════════════════════════════════
  // ENERGIA ELÉTRICA
  // ════════════════════════════════════════════════════════════════════════
  'enel':        'Energia Elétrica',
  'energisa':    'Energia Elétrica',
  'equatorial':  'Energia Elétrica',
  'neoenergia':  'Energia Elétrica',
  'cpfl':        'Energia Elétrica',
  'elektro':     'Energia Elétrica',
  'eletropaulo': 'Energia Elétrica',
  'cemig':       'Energia Elétrica',  // MG
  'copel':       'Energia Elétrica',  // PR (≠ COPASA = água MG)
  'light':       'Energia Elétrica',  // RJ
  'ampla':       'Energia Elétrica',  // RJ
  'celesc':      'Energia Elétrica',  // SC
  'coelba':      'Energia Elétrica',  // BA
  'coelce':      'Energia Elétrica',  // CE
  'celg':        'Energia Elétrica',  // GO
  'ceee':        'Energia Elétrica',  // RS
  'rge':         'Energia Elétrica',  // RS
  'cemar':       'Energia Elétrica',  // MA
  'cosern':      'Energia Elétrica',  // RN
  'saelpa':      'Energia Elétrica',  // PB
  'celpe':       'Energia Elétrica',  // PE
  'ceal':        'Energia Elétrica',  // AL
  'ceron':       'Energia Elétrica',  // RO
  'celtins':     'Energia Elétrica',  // TO
  'energipe':    'Energia Elétrica',  // SE
  'eletroacre':  'Energia Elétrica',  // AC
  'edp':         'Energia Elétrica',
  'comgas':      'Energia Elétrica',  // SP (gas = utility)

  // ════════════════════════════════════════════════════════════════════════
  // TELEFONE E INTERNET
  // ════════════════════════════════════════════════════════════════════════
  'vivo':       'Telefone e Internet',
  'claro':      'Telefone e Internet',
  'tim':        'Telefone e Internet',
  'nextel':     'Telefone e Internet',
  'sky':        'Telefone e Internet',
  'directv':    'Telefone e Internet',
  'telefonica': 'Telefone e Internet',
  'brisanet':   'Telefone e Internet',
  'algar':      'Telefone e Internet',
  'sercomtel':  'Telefone e Internet',
  // 'oi' omitted — too short, too many false positives
  // 'net' omitted — ambiguous (NET telecom vs internet descriptions)

  // ════════════════════════════════════════════════════════════════════════
  // FARMÁCIA
  // ════════════════════════════════════════════════════════════════════════
  'drogasil':   'Farmácia',
  'drogaraia':  'Farmácia',
  'pacheco':    'Farmácia',
  'nissei':     'Farmácia',
  'ultrafarma': 'Farmácia',
  'panvel':     'Farmácia',
  'paguemenos': 'Farmácia',
  'dpsp':       'Farmácia',
  'farmais':    'Farmácia',
  'farmarcas':  'Farmácia',

  // ════════════════════════════════════════════════════════════════════════
  // SUPERMERCADO — only unambiguous names stay here
  // "mercado" alone is REMOVED to prevent matching Mercado Pago / Mercado Livre
  // ════════════════════════════════════════════════════════════════════════
  'carrefour':  'Supermercado',
  'atacadao':   'Supermercado',
  'assai':      'Supermercado',
  'makro':      'Supermercado',
  'walmart':    'Supermercado',
  'zaffari':    'Supermercado',
  'prezunic':   'Supermercado',
  'nagumo':     'Supermercado',
  'sonda':      'Supermercado',
  'condor':     'Supermercado',
  'comper':     'Supermercado',
  'bahamas':    'Supermercado',
  'fort atacadista': 'Supermercado',
  'dia supermercado': 'Supermercado',

  // ════════════════════════════════════════════════════════════════════════
  // RESTAURANTE E DELIVERY
  // ════════════════════════════════════════════════════════════════════════
  'ifood':      'Restaurante e Delivery',
  'rappi':      'Restaurante e Delivery',
  'dominos':    'Restaurante e Delivery',
  'mcdonalds':  'Restaurante e Delivery',
  'subway':     'Restaurante e Delivery',
  'burgerking': 'Restaurante e Delivery',
  'kfc':        'Restaurante e Delivery',
  'giraffas':   'Restaurante e Delivery',
  'habibs':     'Restaurante e Delivery',
  'outback':    'Restaurante e Delivery',
  'bobs':       'Restaurante e Delivery',
  'patroni':    'Restaurante e Delivery',
  'coco bambu': 'Restaurante e Delivery',
  'china in box': 'Restaurante e Delivery',

  // ════════════════════════════════════════════════════════════════════════
  // TRANSPORTE
  // ════════════════════════════════════════════════════════════════════════
  'uber':      'Transporte',
  '99pop':     'Transporte',
  'cabify':    'Transporte',
  'cptm':      'Transporte',
  'supervia':  'Transporte',
  'buser':     'Transporte',
  'latam':     'Transporte',
  'gol':       'Transporte',
  'azul':      'Transporte',

  // ════════════════════════════════════════════════════════════════════════
  // COMBUSTÍVEL
  // ════════════════════════════════════════════════════════════════════════
  'ipiranga':  'Combustível',
  'petrobras': 'Combustível',
  'raizen':    'Combustível',
  'texaco':    'Combustível',
  // 'shell' omitted — matches Shell Gas (combustível) but also Shell Livros (edu)

  // ════════════════════════════════════════════════════════════════════════
  // ASSINATURAS E STREAMING
  // ════════════════════════════════════════════════════════════════════════
  'netflix':     'Assinaturas e Streaming',
  'spotify':     'Assinaturas e Streaming',
  'deezer':      'Assinaturas e Streaming',
  'globoplay':   'Assinaturas e Streaming',
  'crunchyroll': 'Assinaturas e Streaming',
  'twitch':      'Assinaturas e Streaming',
  'youtube premium': 'Assinaturas e Streaming',
  'amazon prime':    'Assinaturas e Streaming',  // multi-word → beats single 'amazon'
  'disney plus':     'Assinaturas e Streaming',
  'hbo max':         'Assinaturas e Streaming',
  'star plus':       'Assinaturas e Streaming',
  'apple tv':        'Assinaturas e Streaming',
  'apple music':     'Assinaturas e Streaming',
  'microsoft 365':   'Assinaturas e Streaming',
  'office 365':      'Assinaturas e Streaming',
  'google one':      'Assinaturas e Streaming',
  'chatgpt':         'Assinaturas e Streaming',
  'openai':          'Assinaturas e Streaming',
  'adobe':           'Assinaturas e Streaming',

  // ════════════════════════════════════════════════════════════════════════
  // ACADEMIA E ESPORTES
  // ════════════════════════════════════════════════════════════════════════
  'smartfit':  'Academia e Esportes',
  'bluefit':   'Academia e Esportes',
  'bodytech':  'Academia e Esportes',
  'bioritmo':  'Academia e Esportes',

  // ════════════════════════════════════════════════════════════════════════
  // SAÚDE
  // ════════════════════════════════════════════════════════════════════════
  'unimed':    'Saúde',
  'amil':      'Saúde',
  'hapvida':   'Saúde',
  'notredame': 'Saúde',
  'sulamerica saude': 'Saúde',
  'bradesco saude':   'Saúde',

  // ════════════════════════════════════════════════════════════════════════
  // PET
  // ════════════════════════════════════════════════════════════════════════
  'cobasi': 'Pet',
  'petz':   'Pet',

  // ════════════════════════════════════════════════════════════════════════
  // ROUPAS E ACESSÓRIOS
  // ════════════════════════════════════════════════════════════════════════
  'renner':    'Roupas e Acessórios',
  'riachuelo': 'Roupas e Acessórios',
  'marisa':    'Roupas e Acessórios',
  'hering':    'Roupas e Acessórios',
  'dafiti':    'Roupas e Acessórios',
  'netshoes':  'Roupas e Acessórios',
  'arezzo':    'Roupas e Acessórios',

  // ════════════════════════════════════════════════════════════════════════
  // VIAGEM
  // ════════════════════════════════════════════════════════════════════════
  'airbnb':   'Viagem',
  'booking':  'Viagem',
  'decolar':  'Viagem',
  'localiza': 'Viagem',
  'movida':   'Viagem',
  'hurb':     'Viagem',

  // ════════════════════════════════════════════════════════════════════════
  // IMPOSTOS E TAXAS
  // ════════════════════════════════════════════════════════════════════════
  'detran':  'Impostos e Taxas',
  'sefaz':   'Impostos e Taxas',
  // 'receita' omitted — too ambiguous (receita = income in Portuguese)
}

/**
 * Try to deterministically identify a category from a normalized description.
 *
 * Returns:
 *  - category name string  → deterministic match, use it directly
 *  - SKIP_TO_AI            → recognized entity (fintech/bank/marketplace) with
 *                            no deterministic category; send to AI with context
 *  - null                  → not recognized at all; send to AI
 *
 * Priority:
 *  1. Multi-word phrases (longest first) — prevents "mercado pago" matching "mercado"
 *  2. Single token exact match
 */
export function matchCompany(normalizedDescription: string): MatchResult {
  const stripped = normalizedDescription
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  // ── Step 1: multi-word phrases (longest first for greedy match) ───────
  const multiWordKeys = Object.keys(COMPANY_REGISTRY)
    .filter(k => k.includes(' '))
    .sort((a, b) => b.length - a.length)  // longest first

  for (const key of multiWordKeys) {
    if (stripped.includes(key)) {
      const val = COMPANY_REGISTRY[key]
      return val === null ? SKIP_TO_AI : val
    }
  }

  // ── Step 2: single token exact match ─────────────────────────────────
  const tokens = stripped
    .split(/[\s\-_\/\.\,\*\(\)]+/)
    .filter(t => t.length >= 3)  // ignore very short tokens (avoids false positives)

  for (const token of tokens) {
    if (Object.prototype.hasOwnProperty.call(COMPANY_REGISTRY, token)) {
      const val = COMPANY_REGISTRY[token]
      return val === null ? SKIP_TO_AI : val
    }
  }

  return null
}
