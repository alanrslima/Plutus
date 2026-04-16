import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from '@/hooks/useAccounts'
import { useToast } from '@/hooks/useToast'
import { Account } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  balance: z.coerce.number().default(0),
})
type FormData = z.infer<typeof schema>

export default function AccountsPage() {
  const { data: accounts = [], isLoading } = useAccounts()
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const deleteAccount = useDeleteAccount()
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) })

  function openCreate() {
    setEditing(null)
    reset({ name: '', balance: 0 })
    setDialogOpen(true)
  }

  function openEdit(account: Account) {
    setEditing(account)
    reset({ name: account.name, balance: account.balance })
    setDialogOpen(true)
  }

  async function onSubmit(data: FormData) {
    try {
      if (editing) {
        await updateAccount.mutateAsync({ id: editing.id, ...data })
        toast({ title: 'Conta atualizada' })
      } else {
        await createAccount.mutateAsync(data)
        toast({ title: 'Conta criada' })
      }
      setDialogOpen(false)
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar a conta' })
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAccount.mutateAsync(id)
      toast({ title: 'Conta excluída' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível excluir a conta' })
    }
  }

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contas</h1>
          <p className="text-muted-foreground text-sm">Saldo total: {formatCurrency(totalBalance)}</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Conta
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Card key={i} className="h-32 animate-pulse" />)}
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p>Nenhuma conta cadastrada ainda.</p>
            <Button variant="link" onClick={openCreate}>Criar primeira conta</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map(account => (
            <Card key={account.id} className="relative">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{account.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${account.balance >= 0 ? 'text-income' : 'text-expense'}`}>
                  {formatCurrency(account.balance)}
                </p>
                <div className="absolute top-3 right-3 flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(account)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(account.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input placeholder="Ex: Nubank, Itaú, Carteira..." {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Saldo inicial</Label>
                <Input type="number" step="0.01" placeholder="0.00" {...register('balance')} />
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
