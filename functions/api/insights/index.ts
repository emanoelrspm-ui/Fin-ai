import { todaySaoPauloISO } from '../../_lib/ai';
import { getTableColumns, requireDB } from '../../_lib/db';
import { errorResponse, jsonResponse } from '../../_lib/responses';
import { AuthContextData, Env } from '../../_lib/types';
import { FIXED_CATEGORIES, FixedCategory } from '../../_lib/validation';

function getPreviousMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

function formatCentsPT(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, 15));
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    month: 'long',
  }).format(dt);
}

interface CatSumRow {
  category: string;
  total_cents: number;
}

interface TopExpenseRow {
  merchant: string;
  amount_cents: number;
  expense_date: string;
  category: string;
}

interface BudgetRow {
  category: string;
  limit_cents: number;
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
    const prevMonth = getPreviousMonth(month);

    const budgetCols = await getTableColumns(db, 'budgets');
    const budgetQuery = budgetCols.has('month')
      ? db
          .prepare(
            'SELECT category, limit_cents FROM budgets WHERE user_id = ? AND (month = ? OR month IS NULL)'
          )
          .bind(context.data.userId, month)
      : db
          .prepare('SELECT category, limit_cents FROM budgets WHERE user_id = ?')
          .bind(context.data.userId);

    const [currRes, prevRes, topRes, budgetRes] = await Promise.all([
      db
        .prepare(
          "SELECT category, COALESCE(SUM(amount_cents), 0) as total_cents FROM expenses WHERE user_id = ? AND substr(expense_date, 1, 7) = ? GROUP BY category"
        )
        .bind(context.data.userId, month)
        .all<CatSumRow>(),
      db
        .prepare(
          "SELECT category, COALESCE(SUM(amount_cents), 0) as total_cents FROM expenses WHERE user_id = ? AND substr(expense_date, 1, 7) = ? GROUP BY category"
        )
        .bind(context.data.userId, prevMonth)
        .all<CatSumRow>(),
      db
        .prepare(
          "SELECT merchant, amount_cents, expense_date, category FROM expenses WHERE user_id = ? AND substr(expense_date, 1, 7) = ? ORDER BY amount_cents DESC LIMIT 1"
        )
        .bind(context.data.userId, month)
        .first<TopExpenseRow>(),
      budgetQuery.all<BudgetRow>(),
    ]);

    const currMap = new Map<FixedCategory, number>();
    const prevMap = new Map<FixedCategory, number>();
    const limitMap = new Map<FixedCategory, number>();

    for (const r of currRes.results ?? []) {
      if ((FIXED_CATEGORIES as readonly string[]).includes(r.category)) {
        currMap.set(r.category as FixedCategory, Number(r.total_cents) || 0);
      }
    }
    for (const r of prevRes.results ?? []) {
      if ((FIXED_CATEGORIES as readonly string[]).includes(r.category)) {
        prevMap.set(r.category as FixedCategory, Number(r.total_cents) || 0);
      }
    }
    for (const r of budgetRes.results ?? []) {
      if ((FIXED_CATEGORIES as readonly string[]).includes(r.category)) {
        limitMap.set(r.category as FixedCategory, Number(r.limit_cents) || 0);
      }
    }

    const totalCurrentCents = Array.from(currMap.values()).reduce((a, b) => a + b, 0);
    const totalPrevCents = Array.from(prevMap.values()).reduce((a, b) => a + b, 0);

    const categoryVariations = FIXED_CATEGORIES.map((category) => {
      const currentCents = currMap.get(category) ?? 0;
      const previousCents = prevMap.get(category) ?? 0;
      const deltaCents = currentCents - previousCents;
      const deltaPct =
        previousCents > 0
          ? Number(((deltaCents / previousCents) * 100).toFixed(1))
          : currentCents > 0
          ? 100
          : 0;
      const limitCents = limitMap.get(category) ?? 0;
      const budgetPct =
        limitCents > 0 ? Number(((currentCents / limitCents) * 100).toFixed(1)) : null;

      return {
        category,
        current_cents: currentCents,
        previous_cents: previousCents,
        delta_cents: deltaCents,
        delta_pct: deltaPct,
        limit_cents: limitCents,
        budget_pct: budgetPct,
      };
    });

    const nearOrOverLimit = categoryVariations.filter(
      (c) => c.budget_pct !== null && c.budget_pct >= 80
    );

    const fastestGrowing = [...categoryVariations]
      .filter((c) => c.delta_cents > 0 && c.current_cents > 0)
      .sort((a, b) => b.delta_cents - a.delta_cents)[0];

    const insights: Array<{
      id: string;
      title: string;
      text: string;
      tone: 'neutral' | 'positive' | 'warning';
    }> = [];

    if (totalCurrentCents > 0) {
      if (nearOrOverLimit.length > 0) {
        const topAlert = [...nearOrOverLimit].sort(
          (a, b) => (b.budget_pct ?? 0) - (a.budget_pct ?? 0)
        )[0];
        const exceeded = (topAlert.budget_pct ?? 0) > 100;
        insights.push({
          id: 'insight-budget',
          title: exceeded
            ? `Orçamento excedido em ${topAlert.category}`
            : `${topAlert.category} próximo do limite`,
          text: exceeded
            ? `Você já gastou ${formatCentsPT(topAlert.current_cents)} em ${topAlert.category} neste mês, ultrapassando o teto de ${formatCentsPT(topAlert.limit_cents)} (${topAlert.budget_pct?.toFixed(0)}%).`
            : `Seus gastos com ${topAlert.category} atingiram ${topAlert.budget_pct?.toFixed(0)}% do orçamento mensal (${formatCentsPT(topAlert.current_cents)} de ${formatCentsPT(topAlert.limit_cents)}).`,
          tone: 'warning',
        });
      }

      if (fastestGrowing && totalPrevCents > 0) {
        const prevLabel = formatMonthLabel(prevMonth);
        const pctLabel =
          fastestGrowing.previous_cents > 0
            ? ` (+${fastestGrowing.delta_pct.toFixed(0)}%)`
            : '';
        insights.push({
          id: 'insight-growth',
          title: `Maior alta em ${fastestGrowing.category}`,
          text: `${fastestGrowing.category} foi a categoria que mais cresceu frente a ${prevLabel}: subiu ${formatCentsPT(fastestGrowing.delta_cents)}${pctLabel}, somando ${formatCentsPT(fastestGrowing.current_cents)}.`,
          tone: 'warning',
        });
      } else if (totalPrevCents > 0 && totalCurrentCents < totalPrevCents) {
        const savedCents = totalPrevCents - totalCurrentCents;
        const dropPct = ((savedCents / totalPrevCents) * 100).toFixed(1).replace('.', ',');
        insights.push({
          id: 'insight-reduction',
          title: 'Redução de gastos no mês',
          text: `Seus gastos em ${formatMonthLabel(month)} estão ${formatCentsPT(savedCents)} (-${dropPct}%) abaixo do mês anterior.`,
          tone: 'positive',
        });
      }

      if (insights.length < 2 && topRes) {
        insights.push({
          id: 'insight-top-expense',
          title: 'Maior despesa do mês',
          text: `Seu maior lançamento em ${formatMonthLabel(month)} foi ${topRes.merchant} (${formatCentsPT(Number(topRes.amount_cents))}) na categoria ${topRes.category}.`,
          tone: 'neutral',
        });
      }
    }

    return jsonResponse({
      month,
      previous_month: prevMonth,
      total_current_cents: totalCurrentCents,
      total_previous_cents: totalPrevCents,
      top_expense: topRes
        ? {
            merchant: topRes.merchant,
            amount_cents: Number(topRes.amount_cents),
            expense_date: topRes.expense_date,
            category: topRes.category,
          }
        : null,
      category_variations: categoryVariations,
      insights: insights.slice(0, 2),
    });
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', 'Erro ao calcular insights.');
  }
};
