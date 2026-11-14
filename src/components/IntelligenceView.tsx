import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Lightbulb,
  Plus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { InsightsResponse } from '../types/finance';
import { CATEGORY_META, formatCentsBRL, formatDateBR } from '../lib/format';
import { CategoryIcon } from './CategoryIcon';

interface IntelligenceViewProps {
  month: string;
  onMonthChange: (nextMonth: string) => void;
  insightsData: InsightsResponse | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpenNewModal: () => void;
}

export function IntelligenceView({
  month,
  onMonthChange,
  insightsData,
  isLoading,
  error,
  onRetry,
  onOpenNewModal,
}: IntelligenceViewProps) {
  const hasAnyData =
    insightsData !== null &&
    (insightsData.total_current_cents > 0 || insightsData.total_previous_cents > 0);

  const totalDeltaCents = insightsData
    ? insightsData.total_current_cents - insightsData.total_previous_cents
    : 0;
  const totalDeltaPct =
    insightsData && insightsData.total_previous_cents > 0
      ? ((totalDeltaCents / insightsData.total_previous_cents) * 100)
          .toFixed(1)
          .replace('.', ',')
      : null;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-[#0D9488] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Análise Comparativa e Insights
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Indicadores calculados em tempo real sobre suas despesas no D1, sem consumo de cota de IA.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="insights-month"
              className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap"
            >
              Mês:
            </label>
            <input
              id="insights-month"
              type="month"
              value={month}
              onChange={(e) => {
                if (e.target.value) onMonthChange(e.target.value);
              }}
              className="h-9 px-3 rounded-lg bg-slate-50 dark:bg-[#0B0F17]/70 border border-slate-200 dark:border-white/[0.1] text-xs font-mono-num text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0D9488] dark:focus:border-emerald-500"
            />
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-300"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 font-semibold underline cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tentar novamente
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-white/[0.06]"
              />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-white/[0.06]" />
        </div>
      ) : !hasAnyData ? (
        <div className="rounded-2xl bg-white dark:bg-[#111827]/85 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.08] p-10 text-center space-y-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 text-[#0D9488] dark:text-emerald-400 flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Nenhuma despesa ainda
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Os comparativos mensais e variações por categoria aparecerão assim que houver lançamentos registrados neste mês ou no anterior.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenNewModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#0D9488] hover:bg-[#047857] dark:bg-emerald-500 dark:hover:bg-teal-400 text-white dark:text-[#0B0F17] text-xs font-semibold cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Registrar primeira despesa
          </button>
        </div>
      ) : (
        <>
          {/* Summary Strip */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white dark:bg-[#111827]/80 border border-slate-200 dark:border-white/[0.07] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total em {insightsData.month}
              </p>
              <p className="mt-2 text-2xl font-bold font-mono-num text-slate-900 dark:text-slate-50">
                {formatCentsBRL(insightsData.total_current_cents)}
              </p>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                Mês anterior ({insightsData.previous_month}):{' '}
                {formatCentsBRL(insightsData.total_previous_cents)}
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#111827]/80 border border-slate-200 dark:border-white/[0.07] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Variação vs. Mês Anterior
              </p>
              <div className="mt-2 flex items-center gap-2">
                {totalDeltaCents > 0 ? (
                  <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                ) : totalDeltaCents < 0 ? (
                  <TrendingDown className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : null}
                <p
                  className={`text-2xl font-bold font-mono-num ${
                    totalDeltaCents > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : totalDeltaCents < 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-900 dark:text-slate-50'
                  }`}
                >
                  {formatCentsBRL(totalDeltaCents, { showPlus: true })}
                </p>
              </div>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                {totalDeltaPct !== null
                  ? `${totalDeltaCents >= 0 ? '+' : ''}${totalDeltaPct}% em relação a ${insightsData.previous_month}`
                  : 'Sem base no mês anterior'}
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#111827]/80 border border-slate-200 dark:border-white/[0.07] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Maior Despesa do Mês
              </p>
              {insightsData.top_expense ? (
                <>
                  <p className="mt-2 text-2xl font-bold font-mono-num text-slate-900 dark:text-slate-50">
                    {formatCentsBRL(insightsData.top_expense.amount_cents)}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                    {insightsData.top_expense.merchant} ·{' '}
                    {formatDateBR(insightsData.top_expense.expense_date)}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-2xl font-bold font-mono-num text-slate-400">—</p>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    Nenhuma despesa em {insightsData.month}
                  </p>
                </>
              )}
            </div>
          </section>

          {/* Natural-language insights */}
          {insightsData.insights.length > 0 && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insightsData.insights.map((item) => {
                const Icon =
                  item.tone === 'warning'
                    ? AlertTriangle
                    : item.tone === 'positive'
                    ? TrendingDown
                    : Lightbulb;
                const style =
                  item.tone === 'warning'
                    ? 'border-amber-200 dark:border-amber-500/25 bg-amber-50/70 dark:bg-amber-500/10'
                    : item.tone === 'positive'
                    ? 'border-emerald-200 dark:border-emerald-500/25 bg-emerald-50/70 dark:bg-emerald-500/10'
                    : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#111827]/80';

                return (
                  <div key={item.id} className={`rounded-2xl border p-5 space-y-2 ${style}`}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-[#0D9488] dark:text-emerald-400 shrink-0" />
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </section>
          )}

          {/* Category variations table */}
          <section className="rounded-2xl bg-white dark:bg-[#111827]/80 border border-slate-200 dark:border-white/[0.07] overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                Variação por Categoria
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Comparativo entre {insightsData.month} e {insightsData.previous_month}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06] text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 pl-5 pr-3">Categoria</th>
                    <th className="py-2.5 px-3 text-right">Mês Atual</th>
                    <th className="py-2.5 px-3 text-right hidden sm:table-cell">
                      Mês Anterior
                    </th>
                    <th className="py-2.5 px-3 text-right">Variação</th>
                    <th className="py-2.5 pl-3 pr-5 text-right hidden md:table-cell">
                      Uso do Teto
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                  {insightsData.category_variations.map((row) => {
                    const meta = CATEGORY_META[row.category];
                    const deltaColor =
                      row.delta_cents > 0
                        ? 'text-amber-700 dark:text-amber-400'
                        : row.delta_cents < 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400';

                    return (
                      <tr
                        key={row.category}
                        className="h-12 hover:bg-slate-50/70 dark:hover:bg-white/[0.02]"
                      >
                        <td className="py-2.5 pl-5 pr-3">
                          <div className="flex items-center gap-2.5">
                            <CategoryIcon category={row.category} size="sm" />
                            <span className={`text-xs sm:text-sm font-medium ${meta.labelText}`}>
                              {row.category}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs sm:text-sm font-mono-num font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatCentsBRL(row.current_cents)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs font-mono-num text-slate-500 dark:text-slate-400 whitespace-nowrap hidden sm:table-cell">
                          {formatCentsBRL(row.previous_cents)}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right text-xs font-mono-num font-semibold whitespace-nowrap ${deltaColor}`}
                        >
                          {formatCentsBRL(row.delta_cents, { showPlus: true })}
                          {row.previous_cents > 0 && (
                            <span className="ml-1 text-[11px] font-normal">
                              ({row.delta_cents >= 0 ? '+' : ''}
                              {row.delta_pct.toFixed(0)}%)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pl-3 pr-5 text-right text-xs font-mono-num text-slate-600 dark:text-slate-300 whitespace-nowrap hidden md:table-cell">
                          {row.budget_pct !== null
                            ? `${row.budget_pct.toFixed(1).replace('.', ',')}%`
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
