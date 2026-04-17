import { TransactionType } from '../../domain/entities/Category'

interface DefaultCategory {
  name: string
  type: TransactionType
  icon?: string
  color?: string
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // ── Despesas ──────────────────────────────────────────────
  { name: 'Alimentação',             type: 'expense', icon: 'Utensils',       color: '#f97316' },
  { name: 'Supermercado',            type: 'expense', icon: 'ShoppingCart',   color: '#f59e0b' },
  { name: 'Restaurante e Delivery',  type: 'expense', icon: 'ChefHat',        color: '#ef4444' },
  { name: 'Moradia',                 type: 'expense', icon: 'Home',           color: '#8b5cf6' },
  { name: 'Transporte',              type: 'expense', icon: 'Bus',            color: '#3b82f6' },
  { name: 'Combustível',             type: 'expense', icon: 'Fuel',           color: '#64748b' },
  { name: 'Saúde',                   type: 'expense', icon: 'Heart',          color: '#ec4899' },
  { name: 'Farmácia',                type: 'expense', icon: 'Pill',           color: '#10b981' },
  { name: 'Educação',                type: 'expense', icon: 'GraduationCap',  color: '#6366f1' },
  { name: 'Lazer e Entretenimento',  type: 'expense', icon: 'Gamepad2',       color: '#a855f7' },
  { name: 'Assinaturas e Streaming', type: 'expense', icon: 'Tv',             color: '#06b6d4' },
  { name: 'Roupas e Acessórios',     type: 'expense', icon: 'ShoppingBag',    color: '#f472b6' },
  { name: 'Telefone e Internet',     type: 'expense', icon: 'Wifi',           color: '#0ea5e9' },
  { name: 'Energia Elétrica',        type: 'expense', icon: 'Zap',            color: '#eab308' },
  { name: 'Água e Saneamento',       type: 'expense', icon: 'Droplets',       color: '#22d3ee' },
  { name: 'Academia e Esportes',     type: 'expense', icon: 'Dumbbell',       color: '#84cc16' },
  { name: 'Pet',                     type: 'expense', icon: 'PawPrint',       color: '#fb923c' },
  { name: 'Viagem',                  type: 'expense', icon: 'Plane',          color: '#38bdf8' },
  { name: 'Impostos e Taxas',        type: 'expense', icon: 'Receipt',        color: '#94a3b8' },
  { name: 'Outros (Despesa)',        type: 'expense', icon: 'MoreHorizontal', color: '#6b7280' },

  // ── Receitas ──────────────────────────────────────────────
  { name: 'Salário',                 type: 'income',  icon: 'Briefcase',      color: '#10b981' },
  { name: 'Freelance',               type: 'income',  icon: 'Laptop',         color: '#6366f1' },
  { name: 'Investimentos',           type: 'income',  icon: 'TrendingUp',     color: '#22c55e' },
  { name: 'Aluguel Recebido',        type: 'income',  icon: 'Building2',      color: '#8b5cf6' },
  { name: 'Dividendos',              type: 'income',  icon: 'PiggyBank',      color: '#f59e0b' },
  { name: 'Reembolso',               type: 'income',  icon: 'RotateCcw',      color: '#14b8a6' },
  { name: 'Presente',                type: 'income',  icon: 'Gift',           color: '#ec4899' },
  { name: 'Outros (Receita)',        type: 'income',  icon: 'MoreHorizontal', color: '#6b7280' },
]
