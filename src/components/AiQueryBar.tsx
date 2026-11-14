import { FormEvent, useState } from 'react';
import { AlertCircle, Loader2, SendHorizontal, Sparkles } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { todaySaoPauloISO } from '../lib/format';
import { Transaction } from '../types/finance';

interface AiQueryBarProps {
  onExpenseCreated?: (tx: Transaction) => void;
}

export function AiQueryBar({ onExpenseCreated }: AiQueryBarProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch<{ expense?: Transaction }>('/api/ai/parse-expense', {
        method: 'POST',
        body: JSON.stringify({
          prompt: trimmed,
          today: todaySaoPauloISO(),
        }),
      });
      if (data.expense && onExpenseCreated) {
        onExpenseCreated(data.expense);
      }
      setInput('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível processar o lançamento com IA.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section aria-label="Registro rápido por linguagem natural" className="space-y-2.5">
      <form
        onSubmit={handleSubmit}
        className="group relative flex items-center gap-3 rounded-2xl bg-white dark:bg-[#111827]/85 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.08] px-4 py-2.5 shadow-[0_4px_12px_-2px_rgba(15,23,42,0.06)] dark:shadow-[0_0_24px_-6px_rgba(16,185,129,0.16)] focus-within:border-teal-600 dark:focus-within:border-emerald-500/60 focus-within:ring-3 focus-within:ring-teal-600/15 dark:focus-within:ring-emerald-500/15 transition-all"
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
          {isLoading ? (
            <Loader2 className="w-[18px] h-[18px] animate-spin" />
          ) : (
            <Sparkles className="w-[18px] h-[18px]" />
          )}
        </div>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          placeholder="Descreva uma despesa (ex: almoço R$ 45,00 no débito)..."
          aria-label="Descreva uma despesa em linguagem natural"
          className="w-full bg-transparent text-sm sm:text-[15px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none min-h-[36px]"
        />

        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0D9488] hover:bg-[#047857] dark:bg-emerald-500 dark:hover:bg-teal-400 text-white dark:text-[#0B0F17] text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 disabled:opacity-45 disabled:pointer-events-none active:scale-[0.98] transition-all cursor-pointer"
        >
          <span>{isLoading ? 'Analisando...' : 'Registrar'}</span>
          <SendHorizontal className="w-3.5 h-3.5" />
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-lg border bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/25 text-red-700 dark:text-red-300"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </span>
        </div>
      )}
    </section>
  );
}
