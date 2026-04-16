import { useState } from 'react'
import { Plus, Pencil, Trash2, Filter } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { useTransactions, useCreateTransaction, useUpdateTransaction, useDeleteTransaction } from '@/hooks/useTransactions'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { useToast } from '@/hooks/useToast'
import { Transaction, TransactionType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils'

const schema = z.object({
  accountId: z.string().uuid('Selecione uma conta'),
  destinationAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  description: z.string().optional(),
  date: z.string().min(1, 'Data obrigatória'),
  totalInstallments: z.preprocess(
    v => (v === '' || v === undefined || v === null) ? undefined : Number(v),
    z.number().int().min(1).max(60).optional(),
  ),
})
type FormData = z.infer<typeof schema>

const typeLabel: Record<TransactionType, string> = { income: 'Receita', expense: 'Despesa', transfer: 'Transferência' }
const typeVariant: Record<TransactionType, 'income' | 'expense' | 'transfer'> = { income: 'income', expense: 'expense', transfer: 'transfer' }

export default function TransactionsPage() {
  const [filters, setFilters] = useState<{ type?: TransactionType; accountId?: string }>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const { data: transactions = [], isLoading } = useTransactions(filters)
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const createTransaction = useCreateTransaction()
  const updateTransaction = useUpdateTransaction()
  const deleteTransaction = useDeleteTransaction()
  const { toast } = useToast()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'expense', date: format(new Date(), 'yyyy-MM-dd') },
  })
  const selectedType = watch('type')
  const selectedAccountId = watch('accountId')
  const selectedCategoryId = watch('categoryId')
  const selectedDestinationAccountId = watch('destinationAccountId')

  function openCreate() {
    setEditing(null)
    reset({
      type: 'expense',
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: undefined,
      accountId: undefined,
      destinationAccountId: undefined,
      categoryId: undefined,
      description: undefined,
      totalInstallments: undefined,
    })
    setDialogOpen(true)
  }

  function openEdit(t: Transaction) {
    setEditing(t)
    reset({
      accountId: t.accountId,
      destinationAccountId: t.destinationAccountId,
      categoryId: t.categoryId,
      type: t.type,
      amount: t.amount,
      description: t.description,
      date: format(new Date(t.date), 'yyyy-MM-dd'),
      totalInstallments: undefined,
    })
    setDialogOpen(true)
  }

  async function onSubmit(data: FormData) {
    try {
      const payload = {
        ...data,
        date: new Date(data.date).toISOString(),
        categoryId: data.categoryId || undefined,
        destinationAccountId: data.destinationAccountId || undefined,
        totalInstallments: data.totalInstallments || undefined,
      }
      if (editing) {
        await updateTransaction.mutateAsync({ id: editing.id, ...payload })
        toast({ title: 'Transação atualizada' })
      } else {
        await createTransaction.mutateAsync(payload)
        toast({ title: 'Transação criada' })
      }
      setDialogOpen(false)
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar a transação' })
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTransaction.mutateAsync(id)
      toast({ title: 'Transação excluída' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível excluir' })
    }
  }

  const filteredCategories = categories.filter(c => !selectedType || c.type === selectedType)
  const accountName = (id: string) => accounts.find(a => a.id === id)?.name ?? id

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transações</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4" /> Filtros
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Transação
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-4 flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[150px] space-y-1">
              <Label>Tipo</Label>
              <Select value={filters.type ?? ''} onValueChange={v => setFilters(f => ({ ...f, type: (v || undefined) as TransactionType }))}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="transfer">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[150px] space-y-1">
              <Label>Conta</Label>
              <Select value={filters.accountId ?? ''} onValueChange={v => setFilters(f => ({ ...f, accountId: v || undefined }))}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={() => setFilters({})}>Limpar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Extrato ({transactions.length} transações)</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-14 animate-pulse bg-muted rounded-md" />)}</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma transação encontrada.</p>
              <Button variant="link" onClick={openCreate}>Criar primeira transação</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map(t => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Badge variant={typeVariant[t.type]} className="shrink-0">{typeLabel[t.type]}</Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.description ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.date)} · {accountName(t.accountId)}
                        {t.totalInstallments && ` · ${t.installment}/${t.totalInstallments}x`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-income' : t.type === 'expense' ? 'text-expense' : 'text-transfer'}`}>
                      {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={selectedType} onValueChange={v => setValue('type', v as TransactionType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Receita</SelectItem>
                    <SelectItem value="expense">Despesa</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Conta</Label>
                <Select value={selectedAccountId ?? ''} onValueChange={v => setValue('accountId', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.accountId && <p className="text-sm text-destructive">{errors.accountId.message}</p>}
              </div>

              {selectedType === 'transfer' && (
                <div className="space-y-2">
                  <Label>Conta Destino</Label>
                  <Select value={selectedDestinationAccountId ?? ''} onValueChange={v => setValue('destinationAccountId', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar destino" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedType !== 'transfer' && (
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={selectedCategoryId ?? ''} onValueChange={v => setValue('categoryId', v)}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input type="number" step="0.01" placeholder="0.00" {...register('amount')} />
                  {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" {...register('date')} />
                  {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input placeholder="Opcional..." {...register('description')} />
              </div>

              {!editing && selectedType === 'expense' && (
                <div className="space-y-2">
                  <Label>Parcelas</Label>
                  <Input type="number" min={1} max={60} placeholder="1 (à vista)" {...register('totalInstallments')} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
