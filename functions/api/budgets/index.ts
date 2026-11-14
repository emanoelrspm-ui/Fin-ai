import { z } from 'zod';
import { todaySaoPauloISO } from '../../_lib/ai';
import { getTableColumns, requireDB } from '../../_lib/db';
import { errorResponse, jsonResponse } from '../../_lib/responses';
import { AuthContextData, Env } from '../../_lib/types';
import {
  FIXED_CATEGORIES,
  FixedCategory,
  MAX_MONETARY_CENTS,
} from '../../_lib/validation';

const PutBudgetSchema = z.object({
  category: z.enum(FIXED_CATEGORIES),
  limit_cents: z
    .number()
    .int('O limite deve ser um valor inteiro em centavos.')
    .min(0, 'O limite não pode ser negativo.')
    .max(MAX_MONETARY_CENTS, 'O limite excede o valor máximo permitido.'),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Mês inválido. Use YYYY-MM.')
    .optional(),
});

interface BudgetRow {
  id?: string;
  category: string;
  limit_cents: number;
}

interface SpentRow {
  category: string;
  spent_cents: number;
}

export const onRequestGet: PagesFunction<Env, string, AuthContextData> = async (
  context
) => {
  try {
    const db = requireDB(context.env);
    const url = new URL(context.request.url);
    const monthParam = url.searchParams.get('month');
    const month =
      monthParam && /^\d{4}-\d{2}$/.test(monthParam)
        ? monthParam
        : todaySaoPauloISO().slice(0, 7);

    const budgetCols = await getTableColumns(db, 'budgets');
    const hasMonthCol = budgetCols.has('month');

    const budgetQuery = hasMonthCol
      ? db
          .prepare(
            'SELECT category, limit_cents FROM budgets WHERE user_id = ? AND (month = ? OR month IS NULL)'
          )
          .bind(context.data.userId, month)
      : db
          .prepare('SELECT category, limit_cents FROM budgets WHERE user_id = ?')
          .bind(context.data.userId);

    const [budgetRes, spentRes] = await Promise.all([
      budgetQuery.all<BudgetRow>(),
      db
        .prepare(
          "SELECT category, COALESCE(SUM(amount_cents), 0) as spent_cents FROM expenses WHERE user_id = ? AND substr(expense_date, 1, 7) = ? GROUP BY category"
        )
        .bind(context.data.userId, month)
        .all<SpentRow>(),
    ]);

    const limitMap = new Map<FixedCategory, number>();
    for (const row of budgetRes.results ?? []) {
      if ((FIXED_CATEGORIES as readonly string[]).includes(row.category)) {
        limitMap.set(row.category as FixedCategory, Number(row.limit_cents) || 0);
      }
    }

    const spentMap = new Map<FixedCategory, number>();
    for (const row of spentRes.results ?? []) {
      if ((FIXED_CATEGORIES as readonly string[]).includes(row.category)) {
        spentMap.set(row.category as FixedCategory, Number(row.spent_cents) || 0);
      }
    }

    const budgets = FIXED_CATEGORIES.map((category) => {
      const limitCents = limitMap.get(category) ?? 0;
      const spentCents = spentMap.get(category) ?? 0;
      const percentage =
        limitCents > 0 ? Number(((spentCents / limitCents) * 100).toFixed(1)) : 0;
      const status =
        limitCents <= 0
          ? 'unset'
          : spentCents > limitCents
          ? 'exceeded'
          : percentage >= 80
          ? 'warning'
          : 'ok';

      return {
        category,
        limit_cents: limitCents,
        spent_cents: spentCents,
        percentage,
        status,
      };
    });

    return jsonResponse({ month, budgets });
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', 'Erro ao carregar orçamentos.');
  }
};

export const onRequestPut: PagesFunction<Env, string, AuthContextData> = async (
  context
) => {
  try {
    const db = requireDB(context.env);
    const body = await context.request.json().catch(() => null);
    const parsed = PutBudgetSchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Dados de orçamento inválidos.';
      return errorResponse(400, 'VALIDATION_ERROR', msg);
    }

    const { category, limit_cents } = parsed.data;
    const month = parsed.data.month || todaySaoPauloISO().slice(0, 7);

    const budgetCols = await getTableColumns(db, 'budgets');
    const hasMonthCol = budgetCols.has('month');
    const hasIdCol = budgetCols.has('id');

    const existing = hasMonthCol
      ? await db
          .prepare(
            'SELECT category FROM budgets WHERE user_id = ? AND category = ? AND month = ?'
          )
          .bind(context.data.userId, category, month)
          .first()
      : await db
          .prepare(
            'SELECT category FROM budgets WHERE user_id = ? AND category = ?'
          )
          .bind(context.data.userId, category)
          .first();

    if (existing) {
      if (hasMonthCol) {
        await db
          .prepare(
            'UPDATE budgets SET limit_cents = ? WHERE user_id = ? AND category = ? AND month = ?'
          )
          .bind(limit_cents, context.data.userId, category, month)
          .run();
      } else {
        await db
          .prepare(
            'UPDATE budgets SET limit_cents = ? WHERE user_id = ? AND category = ?'
          )
          .bind(limit_cents, context.data.userId, category)
          .run();
      }
    } else {
      if (hasMonthCol && hasIdCol) {
        await db
          .prepare(
            'INSERT INTO budgets (id, user_id, category, limit_cents, month) VALUES (?, ?, ?, ?, ?)'
          )
          .bind(crypto.randomUUID(), context.data.userId, category, limit_cents, month)
          .run();
      } else if (hasIdCol) {
        await db
          .prepare(
            'INSERT INTO budgets (id, user_id, category, limit_cents) VALUES (?, ?, ?, ?)'
          )
          .bind(crypto.randomUUID(), context.data.userId, category, limit_cents)
          .run();
      } else if (hasMonthCol) {
        await db
          .prepare(
            'INSERT INTO budgets (user_id, category, limit_cents, month) VALUES (?, ?, ?, ?)'
          )
          .bind(context.data.userId, category, limit_cents, month)
          .run();
      } else {
        await db
          .prepare(
            'INSERT INTO budgets (user_id, category, limit_cents) VALUES (?, ?, ?)'
          )
          .bind(context.data.userId, category, limit_cents)
          .run();
      }
    }

    return jsonResponse({
      budget: {
        category,
        limit_cents,
        month,
      },
    });
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', 'Erro ao atualizar orçamento.');
  }
};
