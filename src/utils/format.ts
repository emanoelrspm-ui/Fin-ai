import { Category, ExpenseCategory, Transaction } from '../types/finance';

export function formatBRL(value: number, options?: { showPlus?: boolean }): string {
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);

  if (value < 0) return `-${formatted}`;
  if (value > 0 && options?.showPlus) return `+${formatted}`;
  return formatted;
}

export function formatDateShort(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
    .format(date)
    .replace('.', '');
}

export function formatDateFull(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Alimentação',
  'Transporte',
  'Educação',
  'Lazer',
  'Outros',
];

export const ALL_CATEGORIES: Category[] = [
  'Alimentação',
  'Transporte',
  'Educação',
  'Lazer',
  'Outros',
  'Receita',
];

export interface CategoryVisualMeta {
  hex: string;
  iconBg: string;
  iconText: string;
  labelText: string;
  barBg: string;
}

export const CATEGORY_META: Record<Category, CategoryVisualMeta> = {
  Alimentação: {
    hex: '#F97316',
    iconBg: 'bg-orange-50 dark:bg-orange-500/15',
    iconText: 'text-orange-600 dark:text-orange-400',
    labelText: 'text-orange-700 dark:text-orange-400',
    barBg: 'bg-orange-500',
  },
  Transporte: {
    hex: '#3B82F6',
    iconBg: 'bg-blue-50 dark:bg-blue-500/15',
    iconText: 'text-blue-600 dark:text-blue-400',
    labelText: 'text-blue-700 dark:text-blue-400',
    barBg: 'bg-blue-500',
  },
  Educação: {
    hex: '#8B5CF6',
    iconBg: 'bg-violet-50 dark:bg-violet-500/15',
    iconText: 'text-violet-600 dark:text-violet-400',
    labelText: 'text-violet-700 dark:text-violet-400',
    barBg: 'bg-violet-500',
  },
  Lazer: {
    hex: '#EC4899',
    iconBg: 'bg-pink-50 dark:bg-pink-500/15',
    iconText: 'text-pink-600 dark:text-pink-400',
    labelText: 'text-pink-700 dark:text-pink-400',
    barBg: 'bg-pink-500',
  },
  Outros: {
    hex: '#64748B',
    iconBg: 'bg-slate-100 dark:bg-slate-500/15',
    iconText: 'text-slate-600 dark:text-slate-300',
    labelText: 'text-slate-600 dark:text-slate-400',
    barBg: 'bg-slate-500',
  },
  Receita: {
    hex: '#10B981',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/15',
    iconText: 'text-emerald-700 dark:text-emerald-400',
    labelText: 'text-emerald-700 dark:text-emerald-400',
    barBg: 'bg-emerald-500',
  },
};

export function exportTransactionsCSV(transactions: Transaction[]): void {
  const headers = ['ID', 'Data', 'Descrição', 'Categoria', 'Pagamento', 'Valor (BRL)'];
  const rows = transactions.map((t) => [
    t.id,
    t.date,
    `"${t.title.replace(/"/g, '""')}"`,
    t.category,
    t.paymentMethod,
    t.amount.toFixed(2).replace('.', ','),
  ]);
  const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `finai-lancamentos-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
