import { useMemo, useState } from 'react'
import { PageHeader } from '../components/common/PageHeader'
import { useExpenses } from '../hooks/useExpenses'
import { useCategories } from '../hooks/useCategories'
import { computeMonthInsights } from '../services/insights.service'
import { formatRupiah } from '../utils/currency'
import { formatDisplayDate, currentMonthKey, shiftMonth, monthLabel } from '../utils/date'
import type { Expense } from '../types/expense'

export function InsightsPage() {
  const { expenses } = useExpenses()
  const { categories } = useCategories()
  const [monthKey, setMonthKey] = useState(currentMonthKey())

  const colorOf = useMemo(() => {
    const m = new Map(categories.map((c) => [c.name, c.color]))
    return (name: string) => m.get(name) ?? '#3b82f6'
  }, [categories])

  const insights = useMemo(
    () => computeMonthInsights(expenses, monthKey),
    [expenses, monthKey]
  )

  const maxCat = insights.categories[0]?.total ?? 0
  const isCurrentOrFuture = monthKey >= currentMonthKey()

  return (
    <div>
      <PageHeader title="Insights" subtitle="Monthly spending breakdown" />

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Month selector */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-2 py-2">
          <button
            onClick={() => setMonthKey((k) => shiftMonth(k, -1))}
            className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-lg leading-none"
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-slate-800">{monthLabel(monthKey)}</span>
          <button
            onClick={() => setMonthKey((k) => shiftMonth(k, 1))}
            disabled={isCurrentOrFuture}
            className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-lg leading-none disabled:opacity-30"
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        {insights.count === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-sm">No expenses in {monthLabel(monthKey)}</p>
          </div>
        ) : (
          <>
            {/* Total card */}
            <div className="bg-blue-700 text-white rounded-xl px-4 py-4">
              <p className="text-blue-200 text-xs uppercase tracking-wide">Total this month</p>
              <p className="text-2xl font-bold mt-0.5">{formatRupiah(insights.total)}</p>
              <p className="text-blue-200 text-xs mt-1">
                {insights.count} expenses · {insights.categories.length} categories
              </p>
            </div>

            {/* Insights bullets */}
            <section className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-2">💡 Insights</h2>
              <ul className="space-y-1.5">
                {insights.bullets.map((b, i) => (
                  <li key={i} className="text-sm text-slate-600 flex gap-2">
                    <span className="text-blue-500 flex-shrink-0">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Category ranking */}
            <section className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">
                Categories — most to least expensive
              </h2>
              <div className="space-y-3">
                {insights.categories.map((c) => (
                  <div key={c.category}>
                    <div className="flex justify-between items-baseline gap-2 mb-1">
                      <span className="text-sm text-slate-700 truncate">{c.category}</span>
                      <span className="text-sm font-semibold text-slate-800 flex-shrink-0">
                        {formatRupiah(c.total)}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${maxCat > 0 ? (c.total / maxCat) * 100 : 0}%`,
                          backgroundColor: colorOf(c.category),
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {Math.round(c.share * 100)}% · {c.count} expense{c.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Top 30 expenses */}
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <h2 className="text-sm font-semibold text-slate-700 p-4 pb-2">
                Top {insights.topExpenses.length} most expensive
              </h2>
              <div className="divide-y divide-slate-50">
                {insights.topExpenses.map((exp: Expense, i: number) => (
                  <div key={exp.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs text-slate-400 w-5 flex-shrink-0 text-right">{i + 1}</span>
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: colorOf(exp.category) }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate">{exp.usage}</p>
                      <p className="text-xs text-slate-400">
                        {exp.category} · {formatDisplayDate(exp.date)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-slate-800 flex-shrink-0">
                      {formatRupiah(exp.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
