import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Transaction, TransactionType } from '../types'

interface TransactionFilters {
  accountId?: string
  categoryId?: string
  type?: TransactionType
  startDate?: string
  endDate?: string
}

export function useTransactions(filters?: TransactionFilters) {
  return useQuery<Transaction[]>({
    queryKey: ['transactions', filters],
    queryFn: async () => (await api.get('/transactions', { params: filters })).data,
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      accountId: string
      destinationAccountId?: string
      categoryId?: string
      referencedTransactionId?: string
      type: TransactionType
      amount: number
      description?: string
      date: string
      totalInstallments?: number
    }) => api.post('/transactions', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Transaction>) => api.put(`/transactions/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}
