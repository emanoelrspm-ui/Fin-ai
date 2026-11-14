import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Download,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { api } from '../lib/api';
import { Category, Transaction } from '../types/finance';
import {
  ALL_CATEGORIES,
  CATEGORY_META,
  formatCentsBRL,
  formatDateBR,
} from '../lib/format';
import { CategoryIcon } from './CategoryIcon';

interface LedgerViewProps {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpenNewModal: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onViewReceipt: (tx: Transaction) => void;
}

export function LedgerView({
  transactions,
  isLoading,
  error,
  onRetry,
  onOpenNewModal,
  onEditTransaction,
  onDeleteTransaction,
  onViewReceipt,
}: LedgerViewProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Todas' | Category>('Todas');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return [...transactions]
      .filter((tx) => {
        if (selectedCategory !== 'Todas' && tx.category !== selectedCategory) return false;
        if (fromDate && tx.date < fromDate) return false;
        if (toDate && tx.date > toDate) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          return (
            tx.title.toLowerCase().includes(q) ||
            tx.category.toLowerCase().includes(q) ||
            tx.paymentMethod.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, selectedCategory, search, fromDate, toDate]);

  const filteredTotalCents = filtered.reduce((acc, tx) => acc + tx.amountCents, 0);

  const handleExportCsv = async () => {
    setExportError(null);
    if (fromDate && toDate && fromDate > toDate) {
      setExportError('A data inicial não pode ser maior que a data final.');
      return;
    }
    setExportingCsv(true);
    try {
      await api.downloadCsv(fromDate || undefined, toDate || undefined);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Não foi possível exportar o CSV.'
      );
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-5 space-y-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por estabelecimento, categoria ou meio..."
              aria-label="Buscar despesas"
              className="w-full h-10 pl-10 pr-3.5 rounded-lg bg-slate-50 dark:bg-[#0B0F17]/70 border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#0D9488] dark:focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleExportCsv()}
              disabled={exportingCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#1E293B]/70 hover:border-[#0D9488] dark:hover:border-emerald-500/40 text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {exportingCsv ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{exportingCsv ? 'Exportando...' : 'Exportar CSV'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenNewModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0D9488] dark:bg-emerald-500 text-white dark:text-[#0B0F17] text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova despesa
            </button>
          </div>
        </div>

        {/* Date range & category filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['Todas', ...ALL_CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#0D9488] dark:bg-emerald-500 text-white dark:text-[#0B0F17]'
                    : 'bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/[0.1]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span>De:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                aria-label="Data inicial"
                className="h-8 px-2 rounded-lg bg-slate-50 dark:bg-[#0B0F17]/70 border border-slate-200 dark:border-white/[0.08] font-mono-num text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0D9488] dark:focus:border-emerald-500"
              />
            </label>
            <label className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span>Até:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                aria-label="Data final"
                className="h-8 px-2 rounded-lg bg-slate-50 dark:bg-[#0B0F17]/70 border border-slate-200 dark:border-white/[0.08] font-mono-num text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0D9488] dark:focus:border-emerald-500"
              />
            </label>
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="text-xs font-medium text-[#0D9488] dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Limpar datas
              </button>
            )}
          </div>
        </div>

        {exportError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{exportError}</span>
          </div>
        )}
      </div>

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

      <div className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-white/[0.06] text-xs text-slate-500 dark:text-slate-400">
          <span>
            Exibindo{' '}
            <strong className="font-mono-num text-slate-900 dark:text-slate-100">
              {filtered.length}
            </strong>{' '}
            lançamentos
          </span>
          <span>
            Total filtrado:{' '}
            <strong className="font-mono-num text-slate-900 dark:text-slate-100">
              {formatCentsBRL(filteredTotalCents)}
            </strong>
          </span>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-11 rounded-lg bg-slate-100 dark:bg-white/[0.04]"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 px-6 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Nenhuma despesa ainda
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quando suas despesas forem registradas ou corresponderem aos filtros, elas aparecerão listadas aqui.
            </p>
            <button
              type="button"
              onClick={onOpenNewModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0D9488] dark:bg-emerald-500 text-white dark:text-[#0B0F17] text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Registrar despesa
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06] text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 pl-5 pr-3">Descrição</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3 hidden sm:table-cell">Pagamento</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Data</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                  <th className="py-2.5 pl-2 pr-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {filtered.map((tx) => {
                  const meta = CATEGORY_META[tx.category];
                  const isAi = tx.source === 'text' || tx.source === 'image';

                  return (
                    <tr
                      key={tx.id}
                      className="h-12 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-2.5 pl-5 pr-3">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <CategoryIcon category={tx.category} size="sm" />
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate block">
                              {tx.title}
                            </span>
                            {(isAi || tx.receiptKey) && (
                              <div className="flex items-center gap-1.5 text-[11px]">
                                {isAi && (
                                  <span className="font-semibold text-[#0D9488] dark:text-emerald-400">
                                    IA
                                  </span>
                                )}
                                {isAi && tx.receiptKey && (
                                  <span className="text-slate-300 dark:text-slate-700">·</span>
                                )}
                                {tx.receiptKey && (
                                  <button
                                    type="button"
                                    onClick={() => onViewReceipt(tx)}
                                    className="inline-flex items-center gap-1 text-[#0D9488] dark:text-emerald-400 hover:underline font-medium cursor-pointer"
                                  >
                                    <ImageIcon className="w-3 h-3" />
                                    Comprovante
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`text-xs font-medium ${meta.labelText}`}>
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap hidden sm:table-cell">
                        {tx.paymentMethod}
                      </td>
                      <td className="py-2.5 px-3 text-xs font-mono-num text-slate-500 dark:text-slate-400 whitespace-nowrap hidden md:table-cell">
                        {formatDateBR(tx.date)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-sm font-mono-num font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatCentsBRL(tx.amountCents)}
                      </td>
                      <td className="py-2.5 pl-2 pr-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditTransaction(tx)}
                            aria-label={`Editar ${tx.title}`}
                            className="w-8 h-8 rounded-md inline-flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTransaction(tx.id)}
                            aria-label={`Excluir ${tx.title}`}
                            className="w-8 h-8 rounded-md inline-flex items-center justify-center text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
