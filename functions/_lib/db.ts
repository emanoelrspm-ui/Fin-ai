import { Env } from './types';
import { FixedCategory, isValidCategory } from './validation';

export function requireDB(env: Env): D1Database {
  if (!env.DB) {
    throw new Error('Binding D1 "DB" não configurado neste ambiente.');
  }
  return env.DB;
}

const tableColumnsCache = new Map<string, Set<string>>();

export async function getTableColumns(
  db: D1Database,
  tableName: string
): Promise<Set<string>> {
  const cached = tableColumnsCache.get(tableName);
  if (cached) return cached;

  const { results } = await db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all<{ name: string }>();

  const cols = new Set((results ?? []).map((r) => r.name));
  if (cols.size > 0) {
    tableColumnsCache.set(tableName, cols);
  }
  return cols;
}

export function normalizeMerchant(merchant: string): string {
  return merchant
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function findMerchantRuleCategory(
  db: D1Database,
  userId: string,
  merchant: string | null
): Promise<FixedCategory | null> {
  if (!merchant) return null;
  const normalized = normalizeMerchant(merchant);
  if (!normalized) return null;

  try {
    const cols = await getTableColumns(db, 'merchant_rules');
    const patternCol = cols.has('merchant_normalized')
      ? 'merchant_normalized'
      : cols.has('pattern')
      ? 'pattern'
      : cols.has('merchant_pattern')
      ? 'merchant_pattern'
      : 'merchant';

    const rows = await db
      .prepare(
        `SELECT ${patternCol} as pattern, category FROM merchant_rules WHERE user_id = ?`
      )
      .bind(userId)
      .all<{ pattern: string; category: string }>();

    for (const row of rows.results ?? []) {
      const rulePattern = normalizeMerchant(row.pattern || '');
      if (
        rulePattern &&
        (normalized === rulePattern || normalized.includes(rulePattern)) &&
        isValidCategory(row.category)
      ) {
        return row.category;
      }
    }
  } catch {
    // Se a tabela ainda não existir ou estiver vazia, não bloqueia o fluxo da IA
    return null;
  }

  return null;
}
