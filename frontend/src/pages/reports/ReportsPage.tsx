import { useState, useMemo, useEffect } from 'react'
import { useMonthlySummary, useCategorySummary, useAccountSummary, useCategoryTrend } from '@/hooks/useReports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const COLORS = ['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']
const TREND_COLORS = [
  '#6366f1', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4', '#a855f7',
  '#fb923c', '#4ade80', '#38bdf8', '#e879f9',
]

export default function ReportsPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const { data: monthly = [] } = useMonthlySummary(year)
  const { data: category = [] } = useCategorySummary()
  const { data: accounts = [] } = useAccountSummary()

  const [trendType, setTrendType] = useState<'expense' | 'income'>('expense')
  const { data: trendData = [] } = useCategoryTrend(year, trendType)

  const allTrendCategories = useMemo(() => {
    const map = new Map<string, string>()
    trendData.forEach(d => map.set(d.categoryId, d.categoryName))
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [trendData])

  const allCategoryIds = useMemo(() => allTrendCategories.map(c => c.id).join(','), [allTrendCategories])

  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    setSelected(new Set(allTrendCategories.map(c => c.id)))
  }, [allCategoryIds])

  const trendMonths = useMemo(() => [...new Set(trendData.map(d => d.month))].sort(), [trendData])

  const trendChartData = useMemo(() => trendMonths.map(month => {
    const [y, m] = month.split('-').map(Number)
    const entry: Record<string, string | number> = {
      month: format(new Date(y, m - 1, 1), 'MMM', { locale: ptBR }),
    }
    allTrendCategories.forEach(cat => {
      const row = trendData.find(d => d.month === month && d.categoryId === cat.id)
      entry[cat.name] = row ? row.total : 0
    })
    return entry
  }), [trendMonths, allTrendCategories, trendData])

  const visibleCategories = allTrendCategories.filter(c => selected.has(c.id))

  const toggleCategory = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const monthlyChart = monthly.map(s => {
    const [y, m] = s.month.split('-').map(Number)
    return {
      month: format(new Date(y, m - 1, 1), 'MMM', { locale: ptBR }),
      Receitas: s.totalIncome,
      Despesas: s.totalExpense,
      Saldo: s.balance,
    }
  })

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <div className="flex items-center gap-2 rounded-lg border border-border px-2 py-1">
          <button
            onClick={() => setYear(y => y - 1)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium w-10 text-center">{year}</span>
          <button
            onClick={() => setYear(y => y + 1)}
            disabled={year >= currentYear}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

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

      {/* Category trend line chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Evolução por Categoria ({year})</CardTitle>
            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              <button
                onClick={() => setTrendType('expense')}
                className={`px-3 py-1.5 transition-colors ${trendType === 'expense' ? 'bg-expense text-white font-medium' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Despesas
              </button>
              <button
                onClick={() => setTrendType('income')}
                className={`px-3 py-1.5 transition-colors ${trendType === 'income' ? 'bg-income text-white font-medium' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Receitas
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {allTrendCategories.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">
                  {selected.size} de {allTrendCategories.length} {selected.size === 1 ? 'categoria' : 'categorias'} visíveis
                </span>
                <div className="flex gap-3 text-xs">
                  <button
                    onClick={() => setSelected(new Set(allTrendCategories.map(c => c.id)))}
                    className="text-muted-foreground hover:text-foreground hover:underline underline-offset-2 transition-colors"
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => setSelected(new Set())}
                    className="text-muted-foreground hover:text-foreground hover:underline underline-offset-2 transition-colors"
                  >
                    Nenhuma
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-5">
                {allTrendCategories.map((cat, i) => {
                  const color = TREND_COLORS[i % TREND_COLORS.length]
                  const active = selected.has(cat.id)
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150"
                      style={active ? {
                        backgroundColor: `${color}18`,
                        borderColor: `${color}55`,
                        color,
                      } : {
                        backgroundColor: 'transparent',
                        borderColor: 'hsl(var(--border))',
                        color: 'hsl(var(--muted-foreground))',
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full flex-shrink-0 transition-colors"
                        style={{ backgroundColor: active ? color : 'hsl(var(--muted-foreground) / 0.4)' }}
                      />
                      {cat.name}
                    </button>
                  )
                })}
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={v => `R$${(v / 1000).toFixed(1)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                  <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
                  {visibleCategories.map(cat => {
                    const idx = allTrendCategories.findIndex(c => c.id === cat.id)
                    return (
                      <Line
                        key={cat.id}
                        type="monotone"
                        dataKey={cat.name}
                        stroke={TREND_COLORS[idx % TREND_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
              Nenhum dado para o período
            </div>
          )}
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
