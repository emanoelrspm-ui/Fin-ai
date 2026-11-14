import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Loader2,
  Pencil,
  RefreshCw,
  Target,
  X,
} from 'lucide-react';
import { CategoryBudgetProgress, ExpenseCategory } from '../types/finance';
import { formatCentsBRL, parseBRLToCents } from '../lib/format';
import { CategoryIcon } from './CategoryIcon';

interface BudgetsViewProps {
  month: string;
  onMonthChange: (nextMonth: string) => void;
  budgets: CategoryBudgetProgress[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSaveBudget: (category: ExpenseCategory, limitCents: number) => Promise<void>;
}

function formatInputCents(cents: number): string {
  if (cents <= 0) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

export function BudgetsView({
  month,
  onMonthChange,
  budgets,
  isLoading,
  error,
  onRetry,
  onSaveBudget,
}: BudgetsViewProps) {
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [draftAmount, setDraftAmount] = useState('');
  const [savingCategory, setSavingCategory] = useState<ExpenseCategory | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startEditing = (item: CategoryBudgetProgress) => {
    setSaveError(null);
    setEditingCategory(item.category);
    setDraftAmount(formatInputCents(item.limit_cents));
  };

  const cancelEditing = () => {
    setEditingCategory(null);
    setDraftAmount('');
    setSaveError(null);
  };

  const handleSave = async (category: ExpenseCategory) => {
    setSaveError(null);
    const trimmed = draftAmount.trim();
    const limitCents = trimmed === '' ? 0 : parseBRLToCents(trimmed);

    if (!Number.isFinite(limitCents) || limitCents < 0) {
      setSaveError('Informe um valor válido em reais (ex: 500,00).');
      return;
    }

    setSavingCategory(category);
    try {
      await onSaveBudget(category, limitCents);
      setEditingCategory(null);
      setDraftAmount('');
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Não foi possível salvar o orçamento.'
      );
    } finally {
      setSavingCategory(null);
    }
  };

  const configuredBudgets = budgets.filter((b) => b.limit_cents > 0);
  const totalLimitCents = configuredBudgets.reduce((acc, b) => acc + b.limit_cents, 0);
  const totalSpentInBudgeted = configuredBudgets.reduce(
    (acc, b) => acc + b.spent_cents,
    0
  );
  const totalSpentAllCents = budgets.reduce((acc, b) => acc + b.spent_cents, 0);
  const overallPct =
    totalLimitCents > 0
      ? Number(((totalSpentInBudgeted / totalLimitCents) * 100).toFixed(1))
      : 0;

  return (
    <div className="space-y-6">
      {/* Header & Month Picker */}
      <section className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-emerald-500/15 text-[#0D9488] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Orçamentos por Categoria
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acompanhe limites mensais, alertas a partir de 80% e excessos acima de 100%.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="budget-month"
              className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap"
            >
              Mês de referência:
            </label>
            <input
              id="budget-month"
              type="month"
              value={month}
              onChange={(e) => {
                if (e.target.value) onMonthChange(e.target.value);
              }}
              className="h-9 px-3 rounded-lg bg-slate-50 dark:bg-[#0B0F17]/70 border border-slate-200 dark:border-white/[0.1] text-xs font-mono-num text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0D9488] dark:focus:border-emerald-500"
            />
          </div>
        </div>

        {!isLoading && !error && (
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Teto Mensal Definido
              </p>
              <p className="mt-1 text-lg font-bold font-mono-num text-slate-900 dark:text-slate-50">
                {formatCentsBRL(totalLimitCents)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gasto Total no Mês
              </p>
              <p className="mt-1 text-lg font-bold font-mono-num text-slate-900 dark:text-slate-50">
                {formatCentsBRL(totalSpentAllCents)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Uso dos Limites Ativos
              </p>
              <p
                className={`mt-1 text-lg font-bold font-mono-num ${
                  totalLimitCents === 0
                    ? 'text-slate-500 dark:text-slate-400'
                    : overallPct > 100
                    ? 'text-red-600 dark:text-red-400'
                    : overallPct >= 80
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-[#0D9488] dark:text-emerald-400'
                }`}
              >
                {totalLimitCents > 0
                  ? `${overallPct.toFixed(1).replace('.', ',')}%`
                  : '—'}
              </p>
            </div>
          </div>
        )}
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

      {saveError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-xs text-red-700 dark:text-red-300"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {!isLoading && !error && configuredBudgets.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/[0.12] bg-white/70 dark:bg-[#111827]/50 p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Nenhum orçamento definido ainda
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Escolha uma categoria abaixo e clique em &ldquo;Definir limite&rdquo; para acompanhar seus gastos reais.
            </p>
          </div>
          {budgets[0] && (
            <button
              type="button"
              onClick={() => startEditing(budgets[0])}
              className="px-4 py-2 rounded-lg bg-[#0D9488] hover:bg-[#047857] dark:bg-emerald-500 dark:hover:bg-teal-400 text-white dark:text-[#0B0F17] text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              Definir primeiro limite
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-white/[0.06]"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3.5">
          {budgets.map((item) => {
            const isEditing = editingCategory === item.category;
            const isSaving = savingCategory === item.category;
            const barWidth =
              item.limit_cents > 0
                ? Math.min(Math.max(item.percentage, item.spent_cents > 0 ? 3 : 0), 100)
                : 0;

            const barColor =
              item.status === 'exceeded'
                ? 'bg-red-500'
                : item.status === 'warning'
                ? 'bg-amber-500'
                : item.status === 'ok'
                ? 'bg-[#0D9488] dark:bg-emerald-500'
                : 'bg-slate-300 dark:bg-slate-600';

            const remainingCents = item.limit_cents - item.spent_cents;

            return (
              <div
                key={item.category}
                className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <CategoryIcon category={item.category} />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {item.category}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs mt-0.5">
                        {item.status === 'unset' && (
                          <span className="text-slate-500 dark:text-slate-400">
                            Sem limite definido
                          </span>
                        )}
                        {item.status === 'ok' && (
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Dentro do limite · {item.percentage.toFixed(1).replace('.', ',')}%
                          </span>
                        )}
                        {item.status === 'warning' && (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Alerta · {item.percentage.toFixed(1).replace('.', ',')}% do teto
                          </span>
                        )}
                        {item.status === 'exceeded' && (
                          <span className="inline-flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Estourado · {item.percentage.toFixed(1).replace('.', ',')}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!isEditing ? (
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold font-mono-num text-slate-900 dark:text-slate-100">
                          {formatCentsBRL(item.spent_cents)}
                          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                            {' '}
                            / {item.limit_cents > 0 ? formatCentsBRL(item.limit_cents) : 'Sem teto'}
                          </span>
                        </p>
                        {item.limit_cents > 0 && (
                          <p
                            className={`text-[11px] font-mono-num ${
                              remainingCents < 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {remainingCents >= 0
                              ? `Disponível: ${formatCentsBRL(remainingCents)}`
                              : `Excedido em ${formatCentsBRL(Math.abs(remainingCents))}`}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => startEditing(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-[#0D9488] dark:hover:border-emerald-500/50 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        {item.limit_cents > 0 ? 'Editar' : 'Definir limite'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono-num">
                          R$
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={draftAmount}
                          onChange={(e) => setDraftAmount(e.target.value)}
                          placeholder="0,00"
                          aria-label={`Limite em reais para ${item.category}`}
                          className="w-32 h-9 pl-8 pr-3 rounded-lg bg-slate-50 dark:bg-[#0B0F17]/70 border border-slate-300 dark:border-white/[0.12] text-xs font-mono-num text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0D9488] dark:focus:border-emerald-500"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void handleSave(item.category)}
                        className="inline-flex items-center gap-1 px-3 h-9 rounded-lg bg-[#0D9488] hover:bg-[#047857] dark:bg-emerald-500 dark:hover:bg-teal-400 text-white dark:text-[#0B0F17] text-xs font-semibold disabled:opacity-50 cursor-pointer"
                      >
                        {isSaving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Salvar
                      </button>

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={cancelEditing}
                        aria-label="Cancelar edição"
                        className="w-9 h-9 rounded-lg border border-slate-200 dark:border-white/[0.1] flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor} transition-all duration-300`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
