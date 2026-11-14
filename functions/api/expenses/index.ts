import { z } from 'zod';
import { getTableColumns, requireDB } from '../../_lib/db';
import { errorResponse, jsonResponse } from '../../_lib/responses';
import { AuthContextData, Env } from '../../_lib/types';
import {
  EXPENSE_SOURCES,
  FIXED_CATEGORIES,
  isUserReceiptKey,
  isValidCategory,
  isValidISODate,
  MAX_MONETARY_CENTS,
  PAYMENT_METHODS,
} from '../../_lib/validation';

const CreateExpenseSchema = z.object({
  merchant: z
    .string()
    .trim()
    .min(1, 'Informe a descrição ou estabelecimento.')
    .max(120, 'Descrição muito longa (máximo 120 caracteres).'),
  amount_cents: z
    .number()
    .int('O valor deve ser um número inteiro em centavos.')
    .positive('O valor deve ser maior que zero.')
    .max(MAX_MONETARY_CENTS, 'O valor excede o limite permitido.'),
  expense_date: z
    .string()
    .refine(isValidISODate, 'Data inválida. Use o formato YYYY-MM-DD.'),
  category: z.enum(FIXED_CATEGORIES),
  payment_method: z.enum(PAYMENT_METHODS).optional().default('Débito'),
  source: z.enum(EXPENSE_SOURCES).optional().default('manual'),
  ai_confidence: z
    .union([
      z.number().min(0).max(1),
      z.object({
        merchant: z.number().min(0).max(1),
        amount: z.number().min(0).max(1),
        date: z.number().min(0).max(1),
        category: z.number().min(0).max(1),
      }),
    ])
    .nullable()
    .optional(),
  receipt_key: z.string().max(220).nullable().optional(),
});

interface ExpenseRow {
  id: string;
  merchant: string;
  amount_cents: number;
  expense_date: string;
  category: string;
  payment_method?: string | null;
  source?: string | null;
  ai_confidence?: number | string | null;
  receipt_key?: string | null;
}

function mapExpenseRow(row: ExpenseRow) {
  let parsedConfidence: unknown = row.ai_confidence ?? null;
  if (typeof row.ai_confidence === 'string') {
    try {
      parsedConfidence = JSON.parse(row.ai_confidence);
    } catch {
      parsedConfidence = Number(row.ai_confidence) || null;
    }
  }

  return {
    id: row.id,
    merchant: row.merchant,
    amount_cents: Number(row.amount_cents),
    expense_date: row.expense_date,
    category: row.category,
    payment_method: row.payment_method || 'Débito',
    source: (row.source as 'manual' | 'text' | 'image') || 'manual',
    ai_confidence: parsedConfidence,
    receipt_key: row.receipt_key ?? null,
  };
}

export const onRequestGet: PagesFunction<Env, string, AuthContextData> = async (
  context
) => {
  try {
    const db = requireDB(context.env);
    const url = new URL(context.request.url);
    const category = url.searchParams.get('category');
    const month = url.searchParams.get('month');
    const q = url.searchParams.get('q')?.trim().slice(0, 100);

    const cols = await getTableColumns(db, 'expenses');
    const selectFields = [
      'id',
      'merchant',
      'amount_cents',
      'expense_date',
      'category',
      cols.has('payment_method') ? 'payment_method' : "'Débito' as payment_method",
      cols.has('source') ? 'source' : "'manual' as source",
      cols.has('ai_confidence') ? 'ai_confidence' : 'NULL as ai_confidence',
      cols.has('receipt_key') ? 'receipt_key' : 'NULL as receipt_key',
    ];

    const where: string[] = ['user_id = ?'];
    const params: unknown[] = [context.data.userId];

    if (category && category !== 'Todas') {
      if (!isValidCategory(category)) {
        return errorResponse(400, 'VALIDATION_ERROR', 'Categoria inválida.');
      }
      where.push('category = ?');
      params.push(category);
    }
    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return errorResponse(400, 'VALIDATION_ERROR', 'Mês inválido.');
      }
      where.push('substr(expense_date, 1, 7) = ?');
      params.push(month);
    }
    if (q) {
      where.push('LOWER(merchant) LIKE ?');
      params.push(`%${q.toLowerCase()}%`);
    }

    const sql = `SELECT ${selectFields.join(', ')} FROM expenses WHERE ${where.join(
      ' AND '
    )} ORDER BY expense_date DESC, rowid DESC LIMIT 500`;

    const { results } = await db
      .prepare(sql)
      .bind(...params)
      .all<ExpenseRow>();

    return jsonResponse({
      expenses: (results ?? []).map(mapExpenseRow),
    });
  } catch {
    return errorResponse(
      500,
      'INTERNAL_ERROR',
      'Não foi possível carregar suas despesas.'
    );
  }
};

export const onRequestPost: PagesFunction<Env, string, AuthContextData> = async (
  context
) => {
  try {
    const db = requireDB(context.env);
    const body = await context.request.json().catch(() => null);
    const parsed = CreateExpenseSchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Dados da despesa inválidos.';
      return errorResponse(400, 'VALIDATION_ERROR', msg);
    }

    const input = parsed.data;
    const receiptKey = input.receipt_key || null;
    if (receiptKey && !isUserReceiptKey(context.data.userId, receiptKey)) {
      return errorResponse(
        404,
        'NOT_FOUND',
        'Comprovante não encontrado para este usuário.'
      );
    }

    const id = crypto.randomUUID();
    const cols = await getTableColumns(db, 'expenses');

    const insertCols = [
      'id',
      'user_id',
      'merchant',
      'amount_cents',
      'expense_date',
      'category',
    ];
    const insertVals: unknown[] = [
      id,
      context.data.userId,
      input.merchant,
      input.amount_cents,
      input.expense_date,
      input.category,
    ];

    if (cols.has('payment_method')) {
      insertCols.push('payment_method');
      insertVals.push(input.payment_method);
    }
    if (cols.has('source')) {
      insertCols.push('source');
      insertVals.push(input.source);
    }
    if (cols.has('ai_confidence')) {
      insertCols.push('ai_confidence');
      const confValue =
        input.ai_confidence === undefined || input.ai_confidence === null
          ? null
          : typeof input.ai_confidence === 'number'
          ? input.ai_confidence
          : Number(
              (
                (input.ai_confidence.merchant +
                  input.ai_confidence.amount +
                  input.ai_confidence.date +
                  input.ai_confidence.category) /
                4
              ).toFixed(2)
            );
      insertVals.push(confValue);
    }
    if (cols.has('receipt_key')) {
      insertCols.push('receipt_key');
      insertVals.push(receiptKey);
    }

    const placeholders = insertCols.map(() => '?').join(', ');
    await db
      .prepare(
        `INSERT INTO expenses (${insertCols.join(', ')}) VALUES (${placeholders})`
      )
      .bind(...insertVals)
      .run();

    return jsonResponse(
      {
        expense: {
          id,
          merchant: input.merchant,
          amount_cents: input.amount_cents,
          expense_date: input.expense_date,
          category: input.category,
          payment_method: input.payment_method,
          source: input.source,
          ai_confidence: input.ai_confidence ?? null,
          receipt_key: receiptKey,
        },
      },
      201
    );
  } catch {
    return errorResponse(
      500,
      'INTERNAL_ERROR',
      'Não foi possível salvar a despesa.'
    );
  }
};
