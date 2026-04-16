import { useState } from 'react'
import { useMonthlySummary, useCategorySummary, useAccountSummary } from '@/hooks/useReports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const COLORS = ['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

export default function ReportsPage() {
  const [year] = useState(new Date().getFullYear())
  const { data: monthly = [] } = useMonthlySummary(year)
  const { data: category = [] } = useCategorySummary()
  const { data: accounts = [] } = useAccountSummary()

  const monthlyChart = monthly.map(s => ({
    month: format(new Date(s.month + '-01'), 'MMM', { locale: ptBR }),
    Receitas: s.totalIncome,
    Despesas: s.totalExpense,
    Saldo: s.balance,
  }))

  const pieData = category.map((c, i) => ({
    name: c.categoryName,
    value: c.total,
    color: COLORS[i % COLORS.length],
  }))

  const totalIncome = monthly.reduce((s, m) => s + m.totalIncome, 0)
  const totalExpense = monthly.reduce((s, m) => s + m.totalExpense, 0)
  const totalBalance = monthly.reduce((s, m) => s + m.balance, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>

      {/* Annual summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Receitas {year}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-income">{formatCurrency(totalIncome)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Despesas {year}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-expense">{formatCurrency(totalExpense)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo {year}</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-income' : 'text-expense'}`}>
              {formatCurrency(totalBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly bar chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Receitas vs Despesas por Mês ({year})</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }}
                formatter={(v: number) => formatCurrency(v)}
              />
              <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
              <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Balance line chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Evolução do Saldo Mensal</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }} formatter={(v: number) => formatCurrency(v)} />
              <Line type="monotone" dataKey="Saldo" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-base">Despesas por Categoria</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }} formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {category.map((c, i) => (
                    <div key={c.categoryId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span>{c.categoryName}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(c.total)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">
                Nenhuma despesa categorizada
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account balances */}
        <Card>
          <CardHeader><CardTitle className="text-base">Saldo por Conta</CardTitle></CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">
                Nenhuma conta cadastrada
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map(a => (
                  <div key={a.accountId} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <span className="text-sm font-medium">{a.accountName}</span>
                    <span className={`text-sm font-bold ${a.balance >= 0 ? 'text-income' : 'text-expense'}`}>
                      {formatCurrency(a.balance)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 mt-2">
                  <span className="text-sm font-semibold">Total</span>
                  <span className={`text-sm font-bold ${accounts.reduce((s, a) => s + a.balance, 0) >= 0 ? 'text-income' : 'text-expense'}`}>
                    {formatCurrency(accounts.reduce((s, a) => s + a.balance, 0))}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
