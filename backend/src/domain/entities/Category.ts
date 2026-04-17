export type TransactionType = 'income' | 'expense' | 'transfer'

export type Category = {
  id: string
  userId: string
  name: string
  type: TransactionType
  icon?: string
  color?: string
  createdAt: Date
}
