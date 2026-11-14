import { ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { CashflowMonth, ExpenseCategory, Transaction } from '../types/finance';
import {
  CATEGORY_META,
  EXPENSE_CATEGORIES,
  formatBRL,
  formatDateShort,
} from '../utils/format';
import { AiQueryBar } from './AiQueryBar';
import { CashflowChart } from './CashflowChart';
import { CategoryIcon } from './CategoryIcon';

interface OverviewViewProps {
  transactions: Transaction[];
  cashflow: CashflowMonth[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onNavigateToLedger: () => void;
  onOpenNewModal: () => void;
}

export function OverviewView({
  transactions,
  cashflow,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onNavigateToLedger,
  onOpenNewModal,
}: OverviewViewProps) {
  const totalIncome = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100) : 0;

  const categoryTotals: Record<ExpenseCategory, number> = {
    Alimentação: 0,
    Transporte: 0,
    Educação: 0,
    Lazer: 0,
    Outros: 0,
  };

  for (const tx of transactions) {
    if (tx.amount < 0 && tx.category !== 'Receita') {
      categoryTotals[tx.category] += Math.abs(tx.amount);
    }
  }

  const sortedCategories = [...EXPENSE_CATEGORIES].sort(
    (a, b) => categoryTotals[b] - categoryTotals[a]
  );

  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  return (
    <div className="space-y-6">
      <AiQueryBar onAddTransaction={onAddTransaction} />

      {/* 4-column KPI Strip */}
      <section
        aria-label="Indicadores principais do mês"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Saldo Disponível
          </p>
          <p className="mt-2 text-2xl font-bold font-mono-num tracking-tight text-slate-900 dark:text-slate-50">
            {formatBRL(balance)}
          </p>
          <p className="mt-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            Superávit ativo · Nov 2026
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Receitas do Mês
          </p>
          <p className="mt-2 text-2xl font-bold font-mono-num tracking-tight text-emerald-700 dark:text-emerald-400">
            {formatBRL(totalIncome, { showPlus: true })}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {transactions.filter((t) => t.amount > 0).length} entradas confirmadas
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Despesas do Mês
          </p>
          <p className="mt-2 text-2xl font-bold font-mono-num tracking-tight text-slate-900 dark:text-slate-50">
            {formatBRL(totalExpense)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {transactions.filter((t) => t.amount < 0).length} lançamentos efetuados
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Taxa de Poupança
          </p>
          <p className="mt-2 text-2xl font-bold font-mono-num tracking-tight text-teal-700 dark:text-teal-300">
            {savingsRate.toFixed(1).replace('.', ',')}%
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Meta recomendada: 30,0%
          </p>
        </div>
      </section>

      {/* Cashflow Chart + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <CashflowChart data={cashflow} />
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

          <div className="mt-5 space-y-4 flex-1 flex flex-col justify-center">
            {sortedCategories.map((cat) => {
              const amount = categoryTotals[cat];
              const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
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
                        {formatBRL(amount)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${meta.barBg} transition-all duration-300`}
                      style={{ width: `${Math.max(pct, amount > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
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
              Últimas movimentações registradas manualmente ou via IA
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenNewModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar manual
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
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nenhum lançamento registrado até o momento.
            </p>
            <button
              type="button"
              onClick={onOpenNewModal}
              className="px-4 py-2 rounded-lg bg-[#0D9488] text-white text-xs font-semibold cursor-pointer"
            >
              Registrar primeiro lançamento
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
            {recentTransactions.map((tx) => {
              const meta = CATEGORY_META[tx.category];
              const isPositive = tx.amount >= 0;

              return (
                <div
                  key={tx.id}
                  className="group flex items-center justify-between gap-4 py-3 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-lg transition-colors"
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
                        <span className="font-mono-num">{formatDateShort(tx.date)}</span>
                        {tx.source === 'ai' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                              Via IA
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-sm font-semibold font-mono-num ${
                        isPositive
                          ? 'text-[#047857] dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {formatBRL(tx.amount, { showPlus: true })}
                    </span>

                    <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => onEditTransaction(tx)}
                        aria-label={`Editar ${tx.title}`}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(tx.id)}
                        aria-label={`Excluir ${tx.title}`}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
