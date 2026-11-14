export const FIXED_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Educação',
  'Lazer',
  'Outros',
] as const;

export type FixedCategory = (typeof FIXED_CATEGORIES)[number];

export function isValidCategory(value: unknown): value is FixedCategory {
  return (
    typeof value === 'string' &&
    (FIXED_CATEGORIES as readonly string[]).includes(value)
  );
}

export function isValidISODate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isValidCents(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value !== 0;
}
