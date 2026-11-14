import { AlertCircle, ArrowRight, Plus, RefreshCw } from 'lucide-react';
import { CashflowMonth, ExpenseCategory, Transaction } from '../types/finance';
import {
  CATEGORY_META,
  FIXED_CATEGORIES,
  formatCentsBRL,
  formatDateBR,
} from '../lib/format';
import { AiQueryBar } from './AiQueryBar';
import { CashflowChart } from './CashflowChart';
import { CategoryIcon } from './CategoryIcon';

interface OverviewViewProps {
  userName: string | null;
  userEmail: string;
  meLoading: boolean;
  meError: string | null;
  onRetryMe: () => void;
  transactions: Transaction[];
  cashflow: CashflowMonth[];
  isLoadingData?: boolean;
  onNavigateToLedger: () => void;
  onOpenNewModal: () => void;
}

export function OverviewView({
  userName,
  userEmail,
  meLoading,
  meError,
  onRetryMe,
  transactions,
  cashflow,
  isLoadingData = false,
  onNavigateToLedger,
  onOpenNewModal,
}: OverviewViewProps) {
  const totalExpenseCents = transactions.reduce(
    (sum, t) => sum + Math.abs(t.amountCents),
    0
  );

  const categoryTotals: Record<ExpenseCategory, number> = {
    Alimentação: 0,
    Transporte: 0,
    Educação: 0,
    Lazer: 0,
    Outros: 0,
  };

  for (const tx of transactions) {
    categoryTotals[tx.category] += Math.abs(tx.amountCents);
  }

  const sortedCategories = [...FIXED_CATEGORIES].sort(
    (a, b) => categoryTotals[b] - categoryTotals[a]
  );

  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  return (
    <div className="space-y-6">
      {/* User Identity Banner from /api/me */}
      <section className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        {meLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-5 w-48 rounded bg-slate-200 dark:bg-white/[0.08]" />
            <div className="h-3.5 w-72 rounded bg-slate-100 dark:bg-white/[0.05]" />
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {userName ? `Olá, ${userName}` : 'Painel Financeiro'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sessão autenticada: {userEmail}
              </p>
            </div>

            {meError && (
              <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 px-3 py-1.5 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{meError}</span>
                <button
                  type="button"
                  onClick={onRetryMe}
                  className="inline-flex items-center gap-1 font-semibold underline cursor-pointer ml-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Tentar novamente
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <AiQueryBar />

      {/* 4-column KPI Strip */}
      <section
        aria-label="Indicadores principais"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total de Despesas
          </p>
          <p className="mt-2 text-2xl font-bold font-mono-num tracking-tight text-slate-900 dark:text-slate-50">
            {formatCentsBRL(totalExpenseCents)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {transactions.length === 0
              ? 'Nenhuma despesa ainda'
              : `${transactions.length} lançamentos`}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Lançamentos no Período
          </p>
          <p className="mt-2 text-2xl font-bold font-mono-num tracking-tight text-slate-900 dark:text-slate-50">
            {transactions.length}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Registros sincronizados em D1
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Maior Categoria
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {totalExpenseCents > 0 ? sortedCategories[0] : '—'}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {totalExpenseCents > 0
              ? formatCentsBRL(categoryTotals[sortedCategories[0]])
              : 'Sem gastos registrados'}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Média por Despesa
          </p>
          <p className="mt-2 text-2xl font-bold font-mono-num tracking-tight text-teal-700 dark:text-teal-300">
            {transactions.length > 0
              ? formatCentsBRL(Math.round(totalExpenseCents / transactions.length))
              : formatCentsBRL(0)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Baseado nos lançamentos ativos
          </p>
        </div>
      </section>

      {/* Cashflow Chart + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <CashflowChart data={cashflow} isLoading={isLoadingData} />
        </div>

        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Distribuição por Categoria
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Participação sobre o total de despesas
            </p>
          </div>

          {totalExpenseCents === 0 ? (
            <div className="mt-5 flex-1 min-h-[160px] flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-white/[0.08] p-5 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Nenhuma despesa ainda
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                As porcentagens por categoria aparecerão após o primeiro registro.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4 flex-1 flex flex-col justify-center">
              {sortedCategories.map((cat) => {
                const amountCents = categoryTotals[cat];
                const pct =
                  totalExpenseCents > 0 ? (amountCents / totalExpenseCents) * 100 : 0;
                const meta = CATEGORY_META[cat];

                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className={`font-medium ${meta.labelText}`}>{cat}</span>
                      <div className="flex items-center gap-2 font-mono-num">
                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                          {pct.toFixed(1).replace('.', ',')}%
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatCentsBRL(amountCents)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${meta.barBg} transition-all duration-300`}
                        style={{ width: `${Math.max(pct, amountCents > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions Ledger */}
      <section className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Lançamentos Recentes
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Últimas despesas registradas na sua conta
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenNewModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova despesa
            </button>
            <button
              type="button"
              onClick={onNavigateToLedger}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D9488] dark:text-emerald-400 hover:text-[#047857] dark:hover:text-emerald-300 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Ver extrato completo
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Nenhuma despesa ainda
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Adicione seu primeiro lançamento para começar a acompanhar seus gastos.
            </p>
            <button
              type="button"
              onClick={onOpenNewModal}
              className="px-4 py-2 rounded-lg bg-[#0D9488] hover:bg-[#047857] dark:bg-emerald-500 dark:hover:bg-teal-400 text-white dark:text-[#0B0F17] text-xs font-semibold cursor-pointer transition-colors"
            >
              Registrar primeira despesa
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
            {recentTransactions.map((tx) => {
              const meta = CATEGORY_META[tx.category];
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-4 py-3 -mx-2 px-2 rounded-lg"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <CategoryIcon category={tx.category} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {tx.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className={`font-medium ${meta.labelText}`}>{tx.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{tx.paymentMethod}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-num">{formatDateBR(tx.date)}</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-sm font-semibold font-mono-num text-slate-900 dark:text-slate-100 shrink-0">
                    {formatCentsBRL(tx.amountCents)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
