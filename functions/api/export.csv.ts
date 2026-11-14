import { getTableColumns, requireDB } from '../_lib/db';
import { errorResponse } from '../_lib/responses';
import { AuthContextData, Env } from '../_lib/types';
import { isValidISODate } from '../_lib/validation';

function escapeCsvCell(value: string): string {
  const str = String(value ?? '');
  const trimmedStart = str.replace(/^[\t\r\n ]+/, '');
  const needsFormulaGuard =
    /^[=+\-@]/.test(str) || /^[=+\-@]/.test(trimmedStart) || /^[\t\r]/.test(str);
  const safe = needsFormulaGuard ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export const onRequestGet: PagesFunction<Env, string, AuthContextData> = async (
  context
) => {
  try {
    const db = requireDB(context.env);
    const url = new URL(context.request.url);
    const from = url.searchParams.get('from')?.trim() || '';
    const to = url.searchParams.get('to')?.trim() || '';

    if (from && !isValidISODate(from)) {
      return errorResponse(400, 'INVALID_DATE', 'Parâmetro "from" inválido.');
    }
    if (to && !isValidISODate(to)) {
      return errorResponse(400, 'INVALID_DATE', 'Parâmetro "to" inválido.');
    }
    if (from && to && from > to) {
      return errorResponse(
        400,
        'INVALID_DATE_RANGE',
        'A data inicial não pode ser maior que a data final.'
      );
    }

    const cols = await getTableColumns(db, 'expenses');
    const selectFields = [
      'expense_date',
      'merchant',
      'category',
      cols.has('payment_method') ? 'payment_method' : "'Débito' as payment_method",
      cols.has('source') ? 'source' : "'manual' as source",
      'amount_cents',
    ];

    const where = ['user_id = ?'];
    const params: unknown[] = [context.data.userId];
    if (from) {
      where.push('expense_date >= ?');
      params.push(from);
    }
    if (to) {
      where.push('expense_date <= ?');
      params.push(to);
    }

    const { results } = await db
      .prepare(
        `SELECT ${selectFields.join(', ')} FROM expenses WHERE ${where.join(
          ' AND '
        )} ORDER BY expense_date DESC, rowid DESC LIMIT 5000`
      )
      .bind(...params)
      .all<{
        expense_date: string;
        merchant: string;
        category: string;
        payment_method: string;
        source: string;
        amount_cents: number;
      }>();

    const headers = [
      'Data',
      'Estabelecimento',
      'Categoria',
      'Pagamento',
      'Origem',
      'Valor (BRL)',
    ];

    const lines = [
      headers.map(escapeCsvCell).join(';'),
      ...(results ?? []).map((row) => {
        const formattedBRL = (Number(row.amount_cents) / 100)
          .toFixed(2)
          .replace('.', ',');
        return [
          escapeCsvCell(formatDateBR(row.expense_date)),
          escapeCsvCell(row.merchant),
          escapeCsvCell(row.category),
          escapeCsvCell(row.payment_method || 'Débito'),
          escapeCsvCell(row.source || 'manual'),
          escapeCsvCell(formattedBRL),
        ].join(';');
      }),
    ];

    const csvBody = '\uFEFF' + lines.join('\r\n');

    return new Response(csvBody, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="finai-despesas.csv"',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', 'Erro ao exportar CSV.');
  }
};
