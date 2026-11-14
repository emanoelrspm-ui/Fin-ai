import { Category, ExpenseCategory } from '../types/finance';

export const FIXED_CATEGORIES: ExpenseCategory[] = [
  'Alimentação',
  'Transporte',
  'Educação',
  'Lazer',
  'Outros',
];

export const ALL_CATEGORIES: Category[] = [...FIXED_CATEGORIES];

export function formatCentsBRL(
  cents: number,
  options?: { showPlus?: boolean }
): string {
  const reais = Math.abs(cents) / 100;
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(reais);

  if (cents < 0) return `-${formatted}`;
  if (cents > 0 && options?.showPlus) return `+${formatted}`;
  return formatted;
}

export function formatBRL(
  reaisValue: number,
  options?: { showPlus?: boolean }
): string {
  return formatCentsBRL(Math.round(reaisValue * 100), options);
}

export function parseBRLToCents(input: string): number {
  const cleaned = input.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

export function todaySaoPauloISO(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

export function formatDateShort(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: 'short',
  })
    .format(date)
    .replace('.', '');
}

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
};
