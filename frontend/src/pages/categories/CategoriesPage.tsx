import { useState } from 'react'
import {
  Plus, Pencil, Trash2,
  // food & drink
  Utensils, ChefHat, Coffee, Pizza, Beer, Apple,
  // shopping
  ShoppingCart, ShoppingBag, Tag,
  // transport
  Car, Bus, Plane, Fuel, Bike, Train,
  // home & utilities
  Home, Building2, Zap, Droplets, Flame, Wifi,
  // health
  Heart, Pill, Stethoscope, Activity,
  // finance & work
  Briefcase, DollarSign, PiggyBank, TrendingUp, Landmark, CreditCard, Wallet, ReceiptText, Receipt,
  // education & entertainment
  GraduationCap, BookOpen, Music, Film, Gamepad2, Tv, Camera,
  // lifestyle
  Dumbbell, Scissors, Shirt, PawPrint, Baby,
  // misc
  Gift, RotateCcw, Laptop, MoreHorizontal, ArrowLeftRight, Star, Wrench, Package,
  type LucideIcon,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useCategories'
import { useToast } from '@/hooks/useToast'
import { Category, TransactionType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

// Icon registry — grouped by category for the picker
const ICON_GROUPS: { label: string; icons: { name: string; component: LucideIcon }[] }[] = [
  {
    label: 'Alimentação',
    icons: [
      { name: 'Utensils', component: Utensils },
      { name: 'ChefHat', component: ChefHat },
      { name: 'Coffee', component: Coffee },
      { name: 'Pizza', component: Pizza },
      { name: 'Beer', component: Beer },
      { name: 'Apple', component: Apple },
    ],
  },
  {
    label: 'Compras',
    icons: [
      { name: 'ShoppingCart', component: ShoppingCart },
      { name: 'ShoppingBag', component: ShoppingBag },
      { name: 'Tag', component: Tag },
      { name: 'Shirt', component: Shirt },
      { name: 'Package', component: Package },
    ],
  },
  {
    label: 'Transporte',
    icons: [
      { name: 'Car', component: Car },
      { name: 'Bus', component: Bus },
      { name: 'Plane', component: Plane },
      { name: 'Fuel', component: Fuel },
      { name: 'Bike', component: Bike },
      { name: 'Train', component: Train },
    ],
  },
  {
    label: 'Moradia',
    icons: [
      { name: 'Home', component: Home },
      { name: 'Building2', component: Building2 },
      { name: 'Zap', component: Zap },
      { name: 'Droplets', component: Droplets },
      { name: 'Flame', component: Flame },
      { name: 'Wifi', component: Wifi },
    ],
  },
  {
    label: 'Saúde',
    icons: [
      { name: 'Heart', component: Heart },
      { name: 'Pill', component: Pill },
      { name: 'Stethoscope', component: Stethoscope },
      { name: 'Activity', component: Activity },
      { name: 'Dumbbell', component: Dumbbell },
    ],
  },
  {
    label: 'Finanças',
    icons: [
      { name: 'Briefcase', component: Briefcase },
      { name: 'DollarSign', component: DollarSign },
      { name: 'PiggyBank', component: PiggyBank },
      { name: 'TrendingUp', component: TrendingUp },
      { name: 'Landmark', component: Landmark },
      { name: 'CreditCard', component: CreditCard },
      { name: 'Wallet', component: Wallet },
      { name: 'Receipt', component: Receipt },
      { name: 'ReceiptText', component: ReceiptText },
    ],
  },
  {
    label: 'Educação & Lazer',
    icons: [
      { name: 'GraduationCap', component: GraduationCap },
      { name: 'BookOpen', component: BookOpen },
      { name: 'Music', component: Music },
      { name: 'Film', component: Film },
      { name: 'Gamepad2', component: Gamepad2 },
      { name: 'Tv', component: Tv },
      { name: 'Camera', component: Camera },
    ],
  },
  {
    label: 'Outros',
    icons: [
      { name: 'Gift', component: Gift },
      { name: 'RotateCcw', component: RotateCcw },
      { name: 'Laptop', component: Laptop },
      { name: 'Scissors', component: Scissors },
      { name: 'PawPrint', component: PawPrint },
      { name: 'Baby', component: Baby },
      { name: 'Star', component: Star },
      { name: 'Wrench', component: Wrench },
      { name: 'ArrowLeftRight', component: ArrowLeftRight },
      { name: 'MoreHorizontal', component: MoreHorizontal },
    ],
  },
]

// Flat list for the CategoryIcon helper
const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  ICON_GROUPS.flatMap(g => g.icons.map(i => [i.name, i.component]))
)

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#64748b',
]

function CategoryIcon({ name, color, size = 16 }: { name?: string; color?: string; size?: number }) {
  const Icon = name ? ICON_MAP[name] : undefined
  if (!Icon) return null
  return <Icon size={size} style={{ color: color ?? undefined }} />
}

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  type: z.enum(['income', 'expense', 'transfer']),
  icon: z.string().optional(),
  color: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const typeLabel: Record<TransactionType, string> = {
  income: 'Receita', expense: 'Despesa', transfer: 'Transferência',
}

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
    defaultValues: { type: 'expense', icon: undefined, color: undefined },
  })
  const selectedType = watch('type')
  const selectedIcon = watch('icon')
  const selectedColor = watch('color')

  function openCreate() {
    setEditing(null)
    reset({ name: '', type: 'expense', icon: undefined, color: undefined })
    setDialogOpen(true)
  }

  function openEdit(category: Category) {
    setEditing(category)
    reset({ name: category.name, type: category.type, icon: category.icon, color: category.color })
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
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Card key={i} className="h-12 animate-pulse" />)}
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p>Nenhuma categoria ainda.</p>
            <Button variant="link" onClick={openCreate}>Criar primeira categoria</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(['income', 'expense', 'transfer'] as TransactionType[]).map(type =>
            grouped[type].length > 0 && (
              <div key={type}>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                  {typeLabel[type]}
                </h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped[type].map(cat => (
                    <Card key={cat.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          {(cat.icon || cat.color) && (
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-full shrink-0"
                              style={{ backgroundColor: cat.color ? `${cat.color}20` : '#6366f120' }}
                            >
                              <CategoryIcon name={cat.icon} color={cat.color ?? '#6366f1'} size={16} />
                            </div>
                          )}
                          <span className="text-sm font-medium">{cat.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(cat.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
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

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setValue('color', selectedColor === c ? undefined : c)}
                      className={cn(
                        'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
                        selectedColor === c ? 'border-foreground scale-110' : 'border-transparent',
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Ícone</Label>
                <div className="max-h-52 overflow-y-auto space-y-3 pr-1">
                  {ICON_GROUPS.map(group => (
                    <div key={group.label}>
                      <p className="text-xs text-muted-foreground mb-1.5">{group.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.icons.map(({ name, component: Icon }) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setValue('icon', selectedIcon === name ? undefined : name)}
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-accent',
                              selectedIcon === name ? 'border-foreground bg-accent' : 'border-border',
                            )}
                            title={name}
                          >
                            <Icon size={15} style={{ color: selectedColor ?? undefined }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
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
