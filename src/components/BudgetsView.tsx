import { Target } from 'lucide-react';

interface BudgetsViewProps {
  onOpenNewModal: () => void;
}

export function BudgetsView({ onOpenNewModal }: BudgetsViewProps) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-10 text-center space-y-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-50 dark:bg-emerald-500/15 text-[#0D9488] dark:text-emerald-400 flex items-center justify-center">
        <Target className="w-6 h-6" />
      </div>
      <div className="space-y-1.5 max-w-md mx-auto">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          Nenhum orçamento definido ainda
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Defina tetos mensais por categoria para acompanhar seus gastos reais em tempo real.
        </p>
      </div>
      <button
        type="button"
        onClick={onOpenNewModal}
        className="px-4 py-2.5 rounded-lg bg-[#0D9488] hover:bg-[#047857] dark:bg-emerald-500 dark:hover:bg-teal-400 text-white dark:text-[#0B0F17] text-xs font-semibold cursor-pointer transition-colors"
      >
        Registrar primeira despesa
      </button>
    </div>
  );
}
