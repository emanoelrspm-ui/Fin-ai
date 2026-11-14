import { FormEvent, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  SendHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { api, ApiError, CreateExpenseInput } from '../lib/api';
import {
  FIXED_CATEGORIES,
  parseBRLToCents,
  todaySaoPauloISO,
} from '../lib/format';
import {
  AiConfidenceScores,
  ExpenseCategory,
  PaymentMethod,
  Transaction,
} from '../types/finance';

interface AiQueryBarProps {
  onExpenseSaved: (tx: Transaction) => void;
  onAiUnavailableFallback: (message: string) => void;
  onOpenCameraCapture: () => void;
}

const PAYMENT_METHODS: PaymentMethod[] = ['Débito', 'Crédito', 'Pix', 'Transferência'];

function ConfidenceBadge({ score }: { score: number }) {
  const high = score >= 0.8;
  return (
    <span
      className={`text-[11px] font-medium ${
        high
          ? 'text-emerald-700 dark:text-emerald-400'
          : 'text-amber-600 dark:text-amber-400'
      }`}
    >
      {high ? 'Confiança alta' : 'Revisar'} ({Math.round(score * 100)}%)
    </span>
  );
}

export function AiQueryBar({
  onExpenseSaved,
  onAiUnavailableFallback,
  onOpenCameraCapture,
}: AiQueryBarProps) {
  const [input, setInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado de prévia/revisão inline do rascunho interpretado pela IA
  const [draftConfidence, setDraftConfidence] = useState<AiConfidenceScores | null>(
    null
  );
  const [merchant, setMerchant] = useState('');
  const [amountRaw, setAmountRaw] = useState('');
  const [date, setDate] = useState(todaySaoPauloISO);
  const [category, setCategory] = useState<ExpenseCategory>('Outros');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Débito');

  const clearPreview = () => {
    setDraftConfidence(null);
    setMerchant('');
    setAmountRaw('');
    setDate(todaySaoPauloISO());
    setCategory('Outros');
    setPaymentMethod('Débito');
    setError(null);
  };

  const handleAnalyzeText = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isParsing) return;

    if (trimmed.length > 300) {
      setError('A descrição deve ter no máximo 300 caracteres.');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const { draft } = await api.parseTextExpense(trimmed);
      setMerchant(draft.merchant ?? '');
      setAmountRaw(
        draft.amount_cents !== null
          ? (draft.amount_cents / 100).toFixed(2).replace('.', ',')
          : ''
      );
      setDate(draft.expense_date ?? todaySaoPauloISO());
      setCategory(draft.category ?? 'Outros');
      setPaymentMethod('Débito');
      setDraftConfidence(draft.confidence);
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.code === 'AI_UNAVAILABLE' ||
          err.code === 'AI_LIMIT' ||
          err.code === 'UNAVAILABLE_API' ||
          err.status === 503 ||
          err.status === 429)
      ) {
        const msg =
          err.code === 'AI_LIMIT'
            ? err.message
            : 'A IA está indisponível agora (limite diário). Preencha manualmente.';
        onAiUnavailableFallback(msg);
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível interpretar o lançamento.'
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const cents = parseBRLToCents(amountRaw);

    if (!merchant.trim()) {
      setError('Informe o estabelecimento ou descrição antes de salvar.');
      return;
    }
    if (!Number.isInteger(cents) || cents <= 0) {
      setError('Informe um valor válido maior que zero.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: CreateExpenseInput = {
        merchant: merchant.trim(),
        amount_cents: cents,
        expense_date: date,
        category,
        payment_method: paymentMethod,
        source: 'text',
        ai_confidence: draftConfidence,
      };
      const created = await api.createExpense(payload);
      onExpenseSaved(created);
      setInput('');
      clearPreview();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao salvar despesa interpretada.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section aria-label="Registro rápido por linguagem natural" className="space-y-3">
      <form
        onSubmit={handleAnalyzeText}
        className="group relative flex items-center gap-2 sm:gap-3 rounded-2xl bg-white dark:bg-[#111827]/85 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.08] px-3.5 sm:px-4 py-2.5 shadow-[0_4px_12px_-2px_rgba(15,23,42,0.06)] dark:shadow-[0_0_24px_-6px_rgba(16,185,129,0.16)] focus-within:border-teal-600 dark:focus-within:border-emerald-500/60 focus-within:ring-3 focus-within:ring-teal-600/15 dark:focus-within:ring-emerald-500/15 transition-all"
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
          {isParsing ? (
            <Loader2 className="w-[18px] h-[18px] animate-spin" />
          ) : (
            <Sparkles className="w-[18px] h-[18px]" />
          )}
        </div>

        <input
          type="text"
          maxLength={300}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isParsing || isSaving}
          placeholder="Ex: Uber 18,90 hoje"
          aria-label="Descreva uma despesa em linguagem natural"
          className="w-full bg-transparent text-sm sm:text-[15px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none min-h-[36px]"
        />

        <button
          type="button"
          onClick={onOpenCameraCapture}
          title="Ler comprovante por foto"
          aria-label="Ler comprovante por foto"
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-300 hover:text-[#0D9488] dark:hover:text-emerald-400 hover:border-[#0D9488] dark:hover:border-emerald-500/40 shrink-0 transition-colors cursor-pointer"
        >
          <Camera className="w-4 h-4" />
        </button>

        <button
          type="submit"
          disabled={isParsing || isSaving || !input.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0D9488] hover:bg-[#047857] dark:bg-emerald-500 dark:hover:bg-teal-400 text-white dark:text-[#0B0F17] text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 disabled:opacity-45 disabled:pointer-events-none active:scale-[0.98] transition-all cursor-pointer"
        >
          <span>{isParsing ? 'Interpretando...' : 'Interpretar'}</span>
          <SendHorizontal className="w-3.5 h-3.5" />
        </button>
      </form>

      {draftConfidence && (
        <form
          onSubmit={handleConfirmSave}
          className="rounded-2xl bg-white dark:bg-[#111827]/90 border border-teal-200 dark:border-emerald-500/30 p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#0D9488] dark:text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Prévia interpretada pela IA — revise antes de salvar
              </h3>
            </div>
            <button
              type="button"
              onClick={clearPreview}
              aria-label="Descartar prévia"
              className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Estabelecimento
                </label>
                <ConfidenceBadge score={draftConfidence.merchant} />
              </div>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="Nome do local"
                className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-[#0B0F17]/70 border border-slate-200 dark:border-white/[0.1] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0D9488]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Valor
                </label>
                <ConfidenceBadge score={draftConfidence.amount} />
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-medium text-slate-500">
                  R$
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountRaw}
                  onChange={(e) => setAmountRaw(e.target.value)}
                  placeholder="0,00"
                  className="w-full h-10 pl-8 pr-3 rounded-lg bg-slate-50 dark:bg-[#0B0F17]/70 border border-slate-200 dark:border-white/[0.1] text-sm font-mono-num text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0D9488]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Data
                </label>
                <ConfidenceBadge score={draftConfidence.date} />
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-[#0B0F17]/70 border border-slate-200 dark:border-white/[0.1] text-sm font-mono-num text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0D9488]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Categoria
                </label>
                <ConfidenceBadge score={draftConfidence.category} />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-[#0B0F17]/70 border border-slate-200 dark:border-white/[0.1] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0D9488]"
              >
                {FIXED_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Pagamento:</span>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="h-9 px-2.5 rounded-lg bg-slate-50 dark:bg-[#0B0F17]/70 border border-slate-200 dark:border-white/[0.1] text-xs text-slate-900 dark:text-slate-100"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearPreview}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-white/[0.1] text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Descartar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0D9488] hover:bg-[#047857] dark:bg-emerald-500 dark:hover:bg-teal-400 text-white dark:text-[#0B0F17] text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSaving ? 'Salvando...' : 'Salvar despesa'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/25 text-red-700 dark:text-red-300"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}
