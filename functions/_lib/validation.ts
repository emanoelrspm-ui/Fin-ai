export const FIXED_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Educação',
  'Lazer',
  'Outros',
] as const;

export type FixedCategory = (typeof FIXED_CATEGORIES)[number];

export const PAYMENT_METHODS = [
  'Débito',
  'Crédito',
  'Pix',
  'Transferência',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const EXPENSE_SOURCES = ['manual', 'text', 'image'] as const;
export type ExpenseSource = (typeof EXPENSE_SOURCES)[number];

export const MAX_MONETARY_CENTS = 100_000_000; // R$ 1.000.000,00

export function isValidCategory(value: unknown): value is FixedCategory {
  return (
    typeof value === 'string' &&
    (FIXED_CATEGORIES as readonly string[]).includes(value)
  );
}

export function isValidISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function isValidCents(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= MAX_MONETARY_CENTS
  );
}

export function isUserReceiptKey(userId: string, key: unknown): key is string {
  if (typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (!trimmed || trimmed.length > 220) return false;
  if (trimmed.includes('..') || trimmed.includes('\\')) return false;
  const expectedPrefix = `receipts/${userId}/`;
  if (!trimmed.startsWith(expectedPrefix)) return false;
  const filePart = trimmed.slice(expectedPrefix.length);
  return /^[a-zA-Z0-9._-]+$/.test(filePart);
}
