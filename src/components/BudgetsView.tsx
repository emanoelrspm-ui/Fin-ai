import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Plus } from 'lucide-react';
import {
  CategoryBudget,
  ExpenseCategory,
  SavingsGoal,
  Transaction,
} from '../types/finance';
import { CATEGORY_META, formatBRL } from '../utils/format';
import { CategoryIcon } from './CategoryIcon';

interface BudgetsViewProps {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  goals: SavingsGoal[];
  onUpdateBudget: (category: ExpenseCategory, newLimit: number) => void;
  onContributeGoal: (goalId: string, amount: number) => void;
}

export function BudgetsView({
  transactions,
  budgets,
  goals,
  onUpdateBudget,
  onContributeGoal,
}: BudgetsViewProps) {
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [limitDraft, setLimitDraft] = useState('');

  const spentByCategory = budgets.reduce<Record<string, number>>((acc, b) => {
    acc[b.category] = transactions
      .filter((t) => t.amount < 0 && t.category === b.category)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return acc;
  }, {});

  const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = Object.values(spentByCategory).reduce((sum, v) => sum + v, 0);

  return (
    <div className="space-y-6">
      {/* Category Monthly Budgets */}
      <section className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-6 space-y-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Orçamento Mensal por Categoria
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Acompanhamento em tempo real dos tetos definidos para novembro
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 dark:text-slate-400">Utilização global</span>
            <p className="text-sm font-bold font-mono-num text-slate-900 dark:text-slate-100">
              {formatBRL(totalSpent)} / {formatBRL(totalBudget)}
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
          {budgets.map((b) => {
            const spent = spentByCategory[b.category] || 0;
            const ratio = b.limit > 0 ? (spent / b.limit) * 100 : 0;
            const meta = CATEGORY_META[b.category];
            const isOver = spent > b.limit;
            const isNear = !isOver && ratio >= 80;

            return (
              <div key={b.category} className="py-4 first:pt-1 last:pb-1 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CategoryIcon category={b.category} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {b.category}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs">
                        {isOver ? (
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Limite excedido
                          </span>
                        ) : isNear ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Atenção ({ratio.toFixed(0)}% usado)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Dentro do previsto ({ratio.toFixed(0)}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {editingCategory === b.category ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={limitDraft}
                          onChange={(e) => setLimitDraft(e.target.value)}
                          className="w-28 h-8 px-2.5 rounded-md border border-slate-300 dark:border-white/[0.15] bg-white dark:bg-[#0B0F17] text-xs font-mono-num text-slate-900 dark:text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = Number(limitDraft);
                            if (val > 0) onUpdateBudget(b.category, val);
                            setEditingCategory(null);
                          }}
                          className="px-2.5 py-1 rounded-md bg-[#0D9488] dark:bg-emerald-500 text-white dark:text-[#0B0F17] text-xs font-semibold cursor-pointer"
                        >
                          Salvar
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-mono-num text-slate-700 dark:text-slate-300">
                          <strong className="text-slate-900 dark:text-slate-100">
                            {formatBRL(spent)}
                          </strong>{' '}
                          / {formatBRL(b.limit)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(b.category);
                            setLimitDraft(String(b.limit));
                          }}
                          className="text-xs font-medium text-[#0D9488] dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          Ajustar teto
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isOver ? 'bg-red-500' : meta.barBg
                    }`}
                    style={{ width: `${Math.min(ratio, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Savings Goals */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Metas Patrimoniais e Reservas
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Registre aportes diretos para acelerar o cumprimento de cada objetivo
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);

            return (
              <div
                key={goal.id}
                className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-5 flex flex-col justify-between space-y-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Prazo: {goal.deadline}</span>
                    <span className="font-mono-num font-semibold text-emerald-700 dark:text-emerald-400">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {goal.name}
                  </h3>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between font-mono-num">
                    <span className="text-lg font-bold text-slate-900 dark:text-slate-50">
                      {formatBRL(goal.currentAmount)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      de {formatBRL(goal.targetAmount)}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#0D9488] dark:bg-emerald-400 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onContributeGoal(goal.id, 500)}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 dark:border-white/[0.1] text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-teal-50/70 dark:hover:bg-emerald-500/10 hover:border-[#0D9488] dark:hover:border-emerald-500/40 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#0D9488] dark:text-emerald-400" />
                  Aportar R$ 500,00
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
