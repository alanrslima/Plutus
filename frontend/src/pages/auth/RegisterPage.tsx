import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const { register: registerUser } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      await registerUser(data.name, data.email, data.password)
      toast({ title: 'Conta criada!', description: 'Faça login para continuar' })
      navigate('/login')
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao criar conta', description: 'Este email já está em uso' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">💰</div>
          <CardTitle className="text-2xl">Criar conta</CardTitle>
          <CardDescription>Comece a gerenciar suas finanças agora</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" placeholder="Seu nome" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu@email.com" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar conta'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Já tem conta?{' '}
              <Link to="/login" className="text-primary hover:underline">Entrar</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
