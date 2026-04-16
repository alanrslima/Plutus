import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { MonthlySummary, CategorySummary, AccountSummary } from '../types'

export function useMonthlySummary(year: number, month?: number) {
  return useQuery<MonthlySummary[]>({
    queryKey: ['reports', 'monthly', year, month],
    queryFn: async () => (await api.get('/reports/summary/monthly', { params: { year, month } })).data,
  })
}

export function useCategorySummary(startDate?: string, endDate?: string) {
  return useQuery<CategorySummary[]>({
    queryKey: ['reports', 'category', startDate, endDate],
    queryFn: async () => (await api.get('/reports/summary/category', { params: { startDate, endDate } })).data,
  })
}

export function useAccountSummary() {
  return useQuery<AccountSummary[]>({
    queryKey: ['reports', 'account'],
    queryFn: async () => (await api.get('/reports/summary/account')).data,
  })
}
