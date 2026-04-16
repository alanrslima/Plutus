export type TransactionType = 'income' | 'expense' | 'transfer'

export interface User {
  id: string
  name: string
  email: string
}

export interface Account {
  id: string
  userId: string
  name: string
  balance: number
  createdAt: string
}

export interface Category {
  id: string
  userId: string
  name: string
  type: TransactionType
  createdAt: string
}

export interface Transaction {
  id: string
  userId: string
  accountId: string
  destinationAccountId?: string
  categoryId?: string
  type: TransactionType
  amount: number
  description?: string
  date: string
  createdAt: string
  installment?: number
  totalInstallments?: number
  parentTransactionId?: string
}

export interface MonthlySummary {
  month: string
  totalIncome: number
  totalExpense: number
  balance: number
}

export interface CategorySummary {
  categoryId: string
  categoryName: string
  total: number
}

export interface AccountSummary {
  accountId: string
  accountName: string
  balance: number
}
