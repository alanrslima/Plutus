import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useCategories'
import { useToast } from '@/hooks/useToast'
import { Category, TransactionType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  type: z.enum(['income', 'expense', 'transfer']),
})
type FormData = z.infer<typeof schema>

const typeLabel: Record<TransactionType, string> = { income: 'Receita', expense: 'Despesa', transfer: 'Transferência' }
const typeVariant: Record<TransactionType, 'income' | 'expense' | 'transfer'> = { income: 'income', expense: 'expense', transfer: 'transfer' }

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'expense' },
  })
  const selectedType = watch('type')

  function openCreate() {
    setEditing(null)
    reset({ name: '', type: 'expense' })
    setDialogOpen(true)
  }

  function openEdit(category: Category) {
    setEditing(category)
    reset({ name: category.name, type: category.type })
    setDialogOpen(true)
  }

  async function onSubmit(data: FormData) {
    try {
      if (editing) {
        await updateCategory.mutateAsync({ id: editing.id, ...data })
        toast({ title: 'Categoria atualizada' })
      } else {
        await createCategory.mutateAsync(data)
        toast({ title: 'Categoria criada' })
      }
      setDialogOpen(false)
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar a categoria' })
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCategory.mutateAsync(id)
      toast({ title: 'Categoria excluída' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível excluir a categoria' })
    }
  }

  const grouped = categories.reduce<Record<TransactionType, Category[]>>(
    (acc, c) => { acc[c.type].push(c); return acc },
    { income: [], expense: [], transfer: [] },
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categorias</h1>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Card key={i} className="h-12 animate-pulse" />)}</div>
      ) : categories.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p>Nenhuma categoria ainda.</p>
          <Button variant="link" onClick={openCreate}>Criar primeira categoria</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-6">
          {(['income', 'expense', 'transfer'] as TransactionType[]).map(type => (
            grouped[type].length > 0 && (
              <div key={type}>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{typeLabel[type]}</h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped[type].map(cat => (
                    <Card key={cat.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <Badge variant={typeVariant[cat.type]}>{typeLabel[cat.type]}</Badge>
                          <span className="text-sm font-medium">{cat.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(cat.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input placeholder="Ex: Alimentação, Salário..." {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
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
