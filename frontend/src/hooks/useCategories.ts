import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Category, TransactionType } from '../types'

export function useCategories(type?: TransactionType) {
  return useQuery<Category[]>({
    queryKey: ['categories', type],
    queryFn: async () => (await api.get('/categories', { params: type ? { type } : {} })).data,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; type: TransactionType }) => api.post('/categories', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; type?: TransactionType }) => api.put(`/categories/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}
