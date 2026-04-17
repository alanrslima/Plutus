import { TransactionType } from './Category'

export type Transaction = {
  id: string
  userId: string
  accountId: string
  destinationAccountId?: string
  categoryId?: string
  categoryName?: string
  categoryIcon?: string
  categoryColor?: string
  type: TransactionType
  amount: number
  description?: string
  date: Date
  createdAt: Date
  installment?: number
  totalInstallments?: number
  parentTransactionId?: string
}
