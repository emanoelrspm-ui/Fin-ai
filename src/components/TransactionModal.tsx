import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Category, PaymentMethod, Transaction } from '../types/finance';
import { ALL_CATEGORIES } from '../utils/format';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id'>, existingId?: string) => void;
  editingTransaction?: Transaction | null;
}

const PAYMENT_METHODS: PaymentMethod[] = ['Débito', 'Crédito', 'Pix', 'Transferência'];

export function TransactionModal({
  isOpen,
  onClose,
  onSave,
  editingTransaction,
}: TransactionModalProps) {
  const [title, setTitle] = useState('');
  const [amountRaw, setAmountRaw] = useState('');
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState<Category>('Alimentação');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Débito');
  const [date, setDate] = useState('2026-11-14');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingTransaction) {
      setTitle(editingTransaction.title);
      setAmountRaw(Math.abs(editingTransaction.amount).toFixed(2).replace('.', ','));
      setKind(editingTransaction.amount >= 0 ? 'income' : 'expense');
      setCategory(editingTransaction.category);
      setPaymentMethod(editingTransaction.paymentMethod);
      setDate(editingTransaction.date);
    } else {
      setTitle('');
      setAmountRaw('');
      setKind('expense');
      setCategory('Alimentação');
      setPaymentMethod('Débito');
      setDate('2026-11-14');
    }
    setError('');
  }, [editingTransaction, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const numeric = Number(amountRaw.replace(/\./g, '').replace(',', '.'));
    if (!title.trim()) {
      setError('Informe uma descrição para o lançamento.');
      return;
    }
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError('Informe um valor válido maior que zero.');
      return;
    }

    const signedAmount = kind === 'income' ? numeric : -numeric;
    const resolvedCategory = kind === 'income' ? 'Receita' : category === 'Receita' ? 'Outros' : category;

    onSave(
      {
        title: title.trim(),
        amount: signedAmount,
        category: resolvedCategory,
        paymentMethod,
        date,
        source: editingTransaction?.source ?? 'manual',
      },
      editingTransaction?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 id="tx-modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {editingTransaction ? 'Editar lançamento' : 'Novo lançamento'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => {
                setKind('expense');
                if (category === 'Receita') setCategory('Alimentação');
              }}
              className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                kind === 'expense'
                  ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-50 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => {
                setKind('income');
                setCategory('Receita');
              }}
              className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                kind === 'income'
                  ? 'bg-white dark:bg-[#1E293B] text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Receita
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Descrição
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Mercado, Uber, Salário..."
              className="w-full h-11 px-3.5 rounded-lg bg-white dark:bg-[#0B0F17]/70 border border-slate-300 dark:border-white/[0.1] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#0D9488] dark:focus:border-emerald-500 focus:ring-3 focus:ring-[#0D9488]/15"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Valor
              </label>
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
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Data
              </label>
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
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Categoria
              </label>
              <select
                value={kind === 'income' ? 'Receita' : category}
                disabled={kind === 'income'}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full h-11 px-3 rounded-lg bg-white dark:bg-[#0B0F17]/70 border border-slate-300 dark:border-white/[0.1] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0D9488] dark:focus:border-emerald-500 disabled:opacity-60"
              >
                {ALL_CATEGORIES.filter((c) => (kind === 'income' ? c === 'Receita' : c !== 'Receita')).map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  )
                )}
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

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-white/[0.1] text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#0D9488] hover:bg-[#047857] dark:bg-emerald-500 dark:hover:bg-teal-400 text-white dark:text-[#0B0F17] text-sm font-semibold active:scale-[0.98] transition-all cursor-pointer"
            >
              {editingTransaction ? 'Salvar alterações' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
