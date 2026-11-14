import { BarChart3 } from 'lucide-react';

interface IntelligenceViewProps {
  onOpenNewModal: () => void;
}

export function IntelligenceView({ onOpenNewModal }: IntelligenceViewProps) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#111827]/85 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.08] p-10 text-center space-y-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 text-[#0D9488] dark:text-emerald-400 flex items-center justify-center">
        <BarChart3 className="w-6 h-6" />
      </div>
      <div className="space-y-1.5 max-w-md mx-auto">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          Nenhuma despesa ainda
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Os insights comparativos e projeções serão gerados automaticamente a partir dos seus lançamentos reais.
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
