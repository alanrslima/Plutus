import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { useMonthlySummary, useCategorySummary } from '@/hooks/useReports'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const COLORS = ['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899']

export default function DashboardPage() {
  const year = new Date().getFullYear()
  const { data: accounts = [] } = useAccounts()
  const { data: transactions = [] } = useTransactions()
  const { data: monthlySummary = [] } = useMonthlySummary(year)
  const { data: categorySummary = [] } = useCategorySummary()

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)
  const currentMonth = format(new Date(), 'yyyy-MM')
  const currentSummary = monthlySummary.find(s => s.month === currentMonth)
  const recentTransactions = transactions.slice(0, 5)

  const typeLabel: Record<string, string> = { income: 'Receita', expense: 'Despesa', transfer: 'Transferência' }
  const typeVariant: Record<string, 'income' | 'expense' | 'transfer'> = {
    income: 'income', expense: 'expense', transfer: 'transfer',
  }

  const chartData = monthlySummary.map(s => ({
    month: format(new Date(s.month + '-01'), 'MMM', { locale: ptBR }),
    Receitas: s.totalIncome,
    Despesas: s.totalExpense,
  }))

  const pieData = categorySummary.slice(0, 7).map((c, i) => ({
    name: c.categoryName,
    value: c.total,
    color: COLORS[i % COLORS.length],
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Total</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
            <p className="text-xs text-muted-foreground">{accounts.length} conta(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receitas do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-income" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-income">{formatCurrency(currentSummary?.totalIncome ?? 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas do Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-expense" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense">{formatCurrency(currentSummary?.totalExpense ?? 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balanço do Mês</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(currentSummary?.balance ?? 0) >= 0 ? 'text-income' : 'text-expense'}`}>
              {formatCurrency(currentSummary?.balance ?? 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Receitas vs Despesas ({year})</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }}
                  formatter={(v: number) => formatCurrency(v)}
                />
                <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Despesas por Categoria</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }} formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground text-sm">
                Nenhuma despesa categorizada
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader><CardTitle className="text-base">Últimas Transações</CardTitle></CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma transação ainda</p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map(t => (
                <div key={t.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={typeVariant[t.type]}>{typeLabel[t.type]}</Badge>
                    <div>
                      <p className="text-sm font-medium">{t.description ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-income' : t.type === 'expense' ? 'text-expense' : 'text-transfer'}`}>
                    {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
