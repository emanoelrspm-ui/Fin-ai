import { z } from 'zod';
import { getTableColumns, requireDB } from '../../_lib/db';
import { errorResponse, jsonResponse } from '../../_lib/responses';
import { AuthContextData, Env } from '../../_lib/types';
import {
  FIXED_CATEGORIES,
  isValidISODate,
  MAX_MONETARY_CENTS,
  PAYMENT_METHODS,
} from '../../_lib/validation';

const UpdateExpenseSchema = z.object({
  merchant: z.string().trim().min(1).max(120).optional(),
  amount_cents: z.number().int().positive().max(MAX_MONETARY_CENTS).optional(),
  expense_date: z.string().refine(isValidISODate, 'Data inválida.').optional(),
  category: z.enum(FIXED_CATEGORIES).optional(),
  payment_method: z.enum(PAYMENT_METHODS).optional(),
});

export const onRequestPatch: PagesFunction<Env, 'id', AuthContextData> = async (
  context
) => {
  try {
    const db = requireDB(context.env);
    const id = String(context.params.id || '').trim();
    if (!id || id.length > 100) {
      return errorResponse(404, 'NOT_FOUND', 'Despesa não encontrada.');
    }

    const body = await context.request.json().catch(() => null);
    const parsed = UpdateExpenseSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Dados inválidos.';
      return errorResponse(400, 'VALIDATION_ERROR', msg);
    }

    const cols = await getTableColumns(db, 'expenses');
    const updates: string[] = [];
    const values: unknown[] = [];

    if (parsed.data.merchant !== undefined) {
      updates.push('merchant = ?');
      values.push(parsed.data.merchant);
    }
    if (parsed.data.amount_cents !== undefined) {
      updates.push('amount_cents = ?');
      values.push(parsed.data.amount_cents);
    }
    if (parsed.data.expense_date !== undefined) {
      updates.push('expense_date = ?');
      values.push(parsed.data.expense_date);
    }
    if (parsed.data.category !== undefined) {
      updates.push('category = ?');
      values.push(parsed.data.category);
    }
    if (
      parsed.data.payment_method !== undefined &&
      cols.has('payment_method')
    ) {
      updates.push('payment_method = ?');
      values.push(parsed.data.payment_method);
    }

    if (updates.length === 0) {
      return errorResponse(400, 'NO_CHANGES', 'Nenhum campo para atualizar.');
    }

    values.push(id, context.data.userId);
    const result = await db
      .prepare(
        `UPDATE expenses SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
      )
      .bind(...values)
      .run();

    if (!result.meta.changes) {
      return errorResponse(404, 'NOT_FOUND', 'Despesa não encontrada.');
    }

    return jsonResponse({ updated: true, id });
  } catch {
    return errorResponse(
      500,
      'INTERNAL_ERROR',
      'Não foi possível atualizar a despesa.'
    );
  }
};

export const onRequestDelete: PagesFunction<
  Env,
  'id',
  AuthContextData
> = async (context) => {
  try {
    const db = requireDB(context.env);
    const id = String(context.params.id || '').trim();
    if (!id || id.length > 100) {
      return errorResponse(404, 'NOT_FOUND', 'Despesa não encontrada.');
    }

    const cols = await getTableColumns(db, 'expenses');
    let receiptKey: string | null = null;
    if (cols.has('receipt_key')) {
      const existing = await db
        .prepare(
          'SELECT receipt_key FROM expenses WHERE id = ? AND user_id = ?'
        )
        .bind(id, context.data.userId)
        .first<{ receipt_key: string | null }>();
      receiptKey = existing?.receipt_key ?? null;
    }

    const result = await db
      .prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?')
      .bind(id, context.data.userId)
      .run();

    if (!result.meta.changes) {
      return errorResponse(404, 'NOT_FOUND', 'Despesa não encontrada.');
    }

    if (receiptKey && context.env.BUCKET) {
      await context.env.BUCKET.delete(receiptKey).catch(() => {});
    }

    return jsonResponse({ deleted: true, id });
  } catch {
    return errorResponse(
      500,
      'INTERNAL_ERROR',
      'Não foi possível excluir a despesa.'
    );
  }
};
