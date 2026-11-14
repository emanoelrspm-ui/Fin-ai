import { useMemo, useState } from 'react';
import { Download, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Category, Transaction } from '../types/finance';
import {
  ALL_CATEGORIES,
  CATEGORY_META,
  exportTransactionsCSV,
  formatBRL,
  formatDateFull,
} from '../utils/format';
import { CategoryIcon } from './CategoryIcon';

interface LedgerViewProps {
  transactions: Transaction[];
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenNewModal: () => void;
}

export function LedgerView({
  transactions,
  onEditTransaction,
  onDeleteTransaction,
  onOpenNewModal,
}: LedgerViewProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Todas' | Category>('Todas');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');

  const filtered = useMemo(() => {
    return [...transactions]
      .filter((tx) => {
        if (selectedCategory !== 'Todas' && tx.category !== selectedCategory) return false;
        if (typeFilter === 'expense' && tx.amount >= 0) return false;
        if (typeFilter === 'income' && tx.amount < 0) return false;
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
  }, [transactions, selectedCategory, typeFilter, search]);

  const filteredNet = filtered.reduce((acc, tx) => acc + tx.amount, 0);

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
              aria-label="Buscar lançamentos"
              className="w-full h-10 pl-10 pr-3.5 rounded-lg bg-slate-50 dark:bg-[#0B0F17]/70 border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#0D9488] dark:focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80">
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'expense', label: 'Despesas' },
                  { id: 'income', label: 'Receitas' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTypeFilter(item.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    typeFilter === item.id
                      ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-50 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => exportTransactionsCSV(filtered)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#1E293B]/60 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.06] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
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
      </div>

      <div className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-white/[0.06] text-xs text-slate-500 dark:text-slate-400">
          <span>
            Exibindo <strong className="font-mono-num text-slate-900 dark:text-slate-100">{filtered.length}</strong> lançamentos
          </span>
          <span>
            Resultado filtrado:{' '}
            <strong
              className={`font-mono-num ${
                filteredNet >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {formatBRL(filteredNet, { showPlus: true })}
            </strong>
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-14 px-6 text-center space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nenhum lançamento encontrado para os filtros selecionados.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('Todas');
                  setTypeFilter('all');
                }}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-white/[0.1] text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Limpar filtros
              </button>
              <button
                type="button"
                onClick={onOpenNewModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0D9488] dark:bg-emerald-500 text-white dark:text-[#0B0F17] text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo lançamento
              </button>
            </div>
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
                  const isPositive = tx.amount >= 0;

                  return (
                    <tr
                      key={tx.id}
                      className="h-12 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-2.5 pl-5 pr-3">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <CategoryIcon category={tx.category} size="sm" />
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {tx.title}
                          </span>
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
                        {formatDateFull(tx.date)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right text-sm font-mono-num font-semibold whitespace-nowrap ${
                          isPositive
                            ? 'text-[#047857] dark:text-emerald-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {formatBRL(tx.amount, { showPlus: true })}
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
