import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  PenLine,
  Sparkles,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { api, ApiError, CreateExpenseInput } from '../lib/api';
import {
  FIXED_CATEGORIES,
  parseBRLToCents,
  todaySaoPauloISO,
} from '../lib/format';
import { compressReceiptImage } from '../lib/imageCompression';
import {
  AiConfidenceScores,
  ExpenseCategory,
  ExpenseSource,
  PaymentMethod,
  Transaction,
} from '../types/finance';

export type ModalStartMode = 'choose' | 'photo' | 'text' | 'manual';

interface TransactionModalProps {
  isOpen: boolean;
  initialMode?: ModalStartMode;
  fallbackBanner?: string | null;
  editingTransaction?: Transaction | null;
  onClose: () => void;
  onSaved: (tx: Transaction, isEdit: boolean) => void;
}

type FlowStep = 'choose' | 'text-input' | 'processing' | 'review' | 'manual';

const PAYMENT_METHODS: PaymentMethod[] = ['Débito', 'Crédito', 'Pix', 'Transferência'];

function ConfidenceTag({ score }: { score: number }) {
  const isHigh = score >= 0.8;
  return (
    <span
      className={`text-[11px] font-medium ${
        isHigh
          ? 'text-emerald-700 dark:text-emerald-400'
          : 'text-amber-600 dark:text-amber-400'
      }`}
    >
      {isHigh ? 'Alta' : 'Revisar'} ({Math.round(score * 100)}%)
    </span>
  );
}

export function TransactionModal({
  isOpen,
  initialMode = 'choose',
  fallbackBanner = null,
  editingTransaction = null,
  onClose,
  onSaved,
}: TransactionModalProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<FlowStep>('choose');
  const [processingLabel, setProcessingLabel] = useState('Processando...');
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [textDraftInput, setTextDraftInput] = useState('');
  const [source, setSource] = useState<ExpenseSource>('manual');
  const [confidence, setConfidence] = useState<AiConfidenceScores | null>(null);
  const [receiptKey, setReceiptKey] = useState<string | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);

  const [merchant, setMerchant] = useState('');
  const [amountRaw, setAmountRaw] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Alimentação');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Débito');
  const [date, setDate] = useState(todaySaoPauloISO);

  useEffect(() => {
    if (!isOpen) {
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
        setReceiptPreviewUrl(null);
      }
      return;
    }

    setError('');
    setSaving(false);
    setTextDraftInput('');

    if (editingTransaction) {
      setStep('manual');
      setSource(editingTransaction.source);
      setConfidence(null);
      setReceiptKey(editingTransaction.receiptKey ?? null);
      setMerchant(editingTransaction.title);
      setAmountRaw(
        (Math.abs(editingTransaction.amountCents) / 100)
          .toFixed(2)
          .replace('.', ',')
      );
      setCategory(editingTransaction.category);
      setPaymentMethod(editingTransaction.paymentMethod);
      setDate(editingTransaction.date);
      setBannerMessage(null);
      return;
    }

    setMerchant('');
    setAmountRaw('');
    setCategory('Alimentação');
    setPaymentMethod('Débito');
    setDate(todaySaoPauloISO());
    setConfidence(null);
    setReceiptKey(null);
    setBannerMessage(fallbackBanner);

    if (fallbackBanner || initialMode === 'manual') {
      setSource('manual');
      setStep('manual');
    } else if (initialMode === 'text') {
      setStep('text-input');
    } else if (initialMode === 'photo') {
      setStep('choose');
    } else {
      setStep('choose');
    }
  }, [isOpen, initialMode, fallbackBanner, editingTransaction]);

  if (!isOpen) return null;

  const switchToManualFallback = (msg: string) => {
    setBannerMessage(msg);
    setError('');
    setSource('manual');
    setConfidence(null);
    setReceiptKey(null);
    setMerchant('');
    setAmountRaw('');
    setCategory('Outros');
    setDate(todaySaoPauloISO());
    setStep('manual');
  };

  const handleImageSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    setBannerMessage(null);
    setStep('processing');
    setProcessingLabel('Comprimindo comprovante (até 1280px JPEG)...');

    try {
      const compressed = await compressReceiptImage(file);
      const localPreview = URL.createObjectURL(compressed);
      setReceiptPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return localPreview;
      });

      setProcessingLabel('Enviando para armazenamento privado e lendo com IA...');
      const { draft, receipt_key } = await api.parseImageExpense(compressed);

      setSource('image');
      setReceiptKey(receipt_key);
      setConfidence(draft.confidence);
      setMerchant(draft.merchant ?? '');
      setAmountRaw(
        draft.amount_cents !== null
          ? (draft.amount_cents / 100).toFixed(2).replace('.', ',')
          : ''
      );
      setDate(draft.expense_date ?? todaySaoPauloISO());
      setCategory(draft.category ?? 'Outros');
      setStep('review');
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
        switchToManualFallback(msg);
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível processar a imagem.'
      );
      setStep('choose');
    }
  };

  const handleTextAnalyze = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = textDraftInput.trim();
    if (!trimmed) {
      setError('Digite a descrição da despesa.');
      return;
    }

    setError('');
    setBannerMessage(null);
    setStep('processing');
    setProcessingLabel('Interpretando lançamento com Workers AI...');

    try {
      const { draft } = await api.parseTextExpense(trimmed);
      setSource('text');
      setReceiptKey(null);
      setConfidence(draft.confidence);
      setMerchant(draft.merchant ?? '');
      setAmountRaw(
        draft.amount_cents !== null
          ? (draft.amount_cents / 100).toFixed(2).replace('.', ',')
          : ''
      );
      setDate(draft.expense_date ?? todaySaoPauloISO());
      setCategory(draft.category ?? 'Outros');
      setStep('review');
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
        switchToManualFallback(msg);
        return;
      }
      setError(
        err instanceof Error ? err.message : 'Erro ao interpretar texto.'
      );
      setStep('text-input');
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const cents = parseBRLToCents(amountRaw);
    if (!merchant.trim()) {
      setError('Informe a descrição ou estabelecimento.');
      return;
    }
    if (!Number.isInteger(cents) || cents <= 0) {
      setError('Informe um valor válido maior que zero.');
      return;
    }

    setSaving(true);
    try {
      if (editingTransaction) {
        await api.updateExpense(editingTransaction.id, {
          merchant: merchant.trim(),
          amount_cents: cents,
          expense_date: date,
          category,
          payment_method: paymentMethod,
        });
        onSaved(
          {
            ...editingTransaction,
            title: merchant.trim(),
            amountCents: cents,
            date,
            category,
            paymentMethod,
          },
          true
        );
      } else {
        const payload: CreateExpenseInput = {
          merchant: merchant.trim(),
          amount_cents: cents,
          expense_date: date,
          category,
          payment_method: paymentMethod,
          source,
          ai_confidence: confidence,
          receipt_key: receiptKey,
        };
        const created = await api.createExpense(payload);
        onSaved(created, false);
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao salvar despesa.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2
              id="tx-modal-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-50"
            >
              {editingTransaction
                ? 'Editar despesa'
                : step === 'review'
                ? 'Revisar lançamento da IA'
                : step === 'processing'
                ? 'Processando comprovante'
                : 'Nova despesa'}
            </h2>
            {!editingTransaction && step === 'choose' && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Escolha como deseja registrar seu gasto
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs ocultos para câmera e galeria */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={handleImageSelected}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageSelected}
          className="hidden"
        />

        {bannerMessage && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-300"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{bannerMessage}</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* PASSO 1: ESCOLHA DE CAPTURA */}
        {step === 'choose' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-start gap-2 p-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] hover:border-[#0D9488] dark:hover:border-emerald-500/50 text-left transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-[#0D9488] dark:text-emerald-400 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Tirar foto
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Câmera do celular para cupom fiscal
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col items-start gap-2 p-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] hover:border-[#0D9488] dark:hover:border-emerald-500/50 text-left transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-emerald-500/15 text-[#0D9488] dark:text-emerald-400 flex items-center justify-center">
                  <ImagePlus className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Escolher da galeria
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    JPEG, PNG ou WebP (comprimido)
                  </p>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setStep('text-input');
                }}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:border-[#0D9488] dark:hover:border-emerald-500/50 text-left transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#0D9488] dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Texto livre com IA
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ex: almoço 32,50 ontem
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSource('manual');
                  setError('');
                  setStep('manual');
                }}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:border-slate-400 dark:hover:border-white/25 text-left transition-colors cursor-pointer"
              >
                <PenLine className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Preencher manualmente
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Formulário tradicional
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* PASSO 1B: TEXTO LIVRE */}
        {step === 'text-input' && (
          <form onSubmit={handleTextAnalyze} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Descreva sua despesa
              </label>
              <textarea
                rows={3}
                maxLength={300}
                value={textDraftInput}
                onChange={(e) => setTextDraftInput(e.target.value)}
                placeholder="Ex: almoço 32,50 ontem no restaurante"
                className="w-full p-3 rounded-xl bg-white dark:bg-[#0B0F17]/70 border border-slate-300 dark:border-white/[0.1] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#0D9488] dark:focus:border-emerald-500"
              />
              <p className="mt-1 text-[11px] text-slate-400 text-right font-mono-num">
                {textDraftInput.length}/300
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={!textDraftInput.trim()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0D9488] hover:bg-[#047857] dark:bg-emerald-500 dark:hover:bg-teal-400 text-white dark:text-[#0B0F17] text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Interpretar com IA
              </button>
            </div>
          </form>
        )}

        {/* PASSO 2: PROCESSAMENTO ANIMADO */}
        {step === 'processing' && (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-5">
            <div className="relative w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center text-[#0D9488] dark:text-emerald-400 overflow-hidden">
              <Loader2 className="w-7 h-7 animate-spin" />
              <motion.div
                className="absolute inset-x-0 h-0.5 bg-[#0D9488] dark:bg-emerald-400"
                animate={{ y: [-24, 24, -24] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Analisando dados com Workers AI
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {processingLabel}
              </p>
            </div>

            <div className="w-full max-w-xs h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full bg-[#0D9488] dark:bg-emerald-400 rounded-full"
                initial={{ width: '15%' }}
                animate={{ width: ['15%', '85%', '45%'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </div>
        )}

        {/* PASSO 3: REVISÃO DA IA OU FORMULÁRIO MANUAL */}
        {(step === 'review' || step === 'manual') && (
          <form onSubmit={handleSave} className="space-y-4">
            {step === 'review' && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0B0F17]/60 border border-slate-200 dark:border-white/[0.08]">
                {receiptPreviewUrl ? (
                  <img
                    src={receiptPreviewUrl}
                    alt="Miniatura do comprovante"
                    className="w-14 h-14 rounded-lg object-cover border border-slate-200 dark:border-white/[0.1] shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-[#0D9488] dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
                <div className="text-xs">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {receiptPreviewUrl
                      ? 'Comprovante salvo no R2 privado'
                      : 'Rascunho extraído pela IA'}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    Confira os campos em amarelo antes de salvar.
                  </p>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Descrição / Estabelecimento
                </label>
                {confidence && <ConfidenceTag score={confidence.merchant} />}
              </div>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="Ex: Supermercado, Uber, Restaurante..."
                className="w-full h-11 px-3.5 rounded-lg bg-white dark:bg-[#0B0F17]/70 border border-slate-300 dark:border-white/[0.1] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#0D9488] dark:focus:border-emerald-500 focus:ring-3 focus:ring-[#0D9488]/15"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Valor
                  </label>
                  {confidence && <ConfidenceTag score={confidence.amount} />}
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-sm font-medium text-slate-500 dark:text-slate-400 select-none">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amountRaw}
                    onChange={(e) => setAmountRaw(e.target.value)}
                    placeholder="0,00"
                    className="w-full h-11 pl-10 pr-3.5 rounded-lg bg-white dark:bg-[#0B0F17]/70 border border-slate-300 dark:border-white/[0.1] text-sm font-mono-num text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#0D9488] dark:focus:border-emerald-500 focus:ring-3 focus:ring-[#0D9488]/15"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Data
                  </label>
                  {confidence && <ConfidenceTag score={confidence.date} />}
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-white dark:bg-[#0B0F17]/70 border border-slate-300 dark:border-white/[0.1] text-sm font-mono-num text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0D9488] dark:focus:border-emerald-500 focus:ring-3 focus:ring-[#0D9488]/15"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Categoria
                  </label>
                  {confidence && <ConfidenceTag score={confidence.category} />}
                </div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full h-11 px-3 rounded-lg bg-white dark:bg-[#0B0F17]/70 border border-slate-300 dark:border-white/[0.1] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0D9488] dark:focus:border-emerald-500"
                >
                  {FIXED_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Pagamento
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full h-11 px-3 rounded-lg bg-white dark:bg-[#0B0F17]/70 border border-slate-300 dark:border-white/[0.1] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0D9488] dark:focus:border-emerald-500"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              {!editingTransaction ? (
                <button
                  type="button"
                  onClick={() => setStep('choose')}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
                >
                  Outro método
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-white/[0.1] text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg bg-[#0D9488] hover:bg-[#047857] dark:bg-emerald-500 dark:hover:bg-teal-400 text-white dark:text-[#0B0F17] text-sm font-semibold active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {saving
                    ? 'Salvando...'
                    : editingTransaction
                    ? 'Salvar alterações'
                    : 'Salvar despesa'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
