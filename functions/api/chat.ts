import { z } from 'zod';
import {
  AiServiceError,
  checkAndIncrementAiUsage,
  todaySaoPauloISO,
} from '../_lib/ai';
import { requireDB } from '../_lib/db';
import { AI_MODELS } from '../_lib/models';
import { errorResponse, jsonResponse } from '../_lib/responses';
import { AuthContextData, Env } from '../_lib/types';
import {
  FIXED_CATEGORIES,
  FixedCategory,
  isValidISODate,
} from '../_lib/validation';

const ChatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Digite uma pergunta para o assistente.')
    .max(400, 'A pergunta deve ter no máximo 400 caracteres.'),
});

const IntentClassificationSchema = z.object({
  intent: z.enum([
    'total',
    'by_category',
    'top_expenses',
    'compare_months',
    'unknown',
  ]),
  category: z.enum(FIXED_CATEGORIES).nullable(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});

type IntentClassification = z.infer<typeof IntentClassificationSchema>;

function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function getMonthBounds(todayIso: string): { from: string; to: string; prevYm: string; currYm: string } {
  const [y, m] = todayIso.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const currYm = `${y}-${String(m).padStart(2, '0')}`;
  const prevYm =
    m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  return {
    from: `${currYm}-01`,
    to: `${currYm}-${String(lastDay).padStart(2, '0')}`,
    currYm,
    prevYm,
  };
}

function extractRawText(aiResult: unknown): string {
  if (typeof aiResult === 'string') return aiResult;
  if (!aiResult || typeof aiResult !== 'object') return '';
  const obj = aiResult as Record<string, unknown>;
  if (typeof obj.response === 'string') return obj.response;
  const choices = obj.choices as Array<{ message?: { content?: string } }> | undefined;
  if (Array.isArray(choices) && choices[0]?.message?.content) {
    return choices[0].message.content;
  }
  return JSON.stringify(aiResult);
}

function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

function normalizeIntentPayload(rawObj: unknown): unknown {
  if (!rawObj || typeof rawObj !== 'object') return rawObj;
  const obj = { ...(rawObj as Record<string, unknown>) };

  const allowedIntents = [
    'total',
    'by_category',
    'top_expenses',
    'compare_months',
    'unknown',
  ];
  if (typeof obj.intent !== 'string' || !allowedIntents.includes(obj.intent)) {
    obj.intent = 'unknown';
  }

  if (
    typeof obj.category !== 'string' ||
    !(FIXED_CATEGORIES as readonly string[]).includes(obj.category)
  ) {
    obj.category = null;
  }

  obj.from = isValidISODate(obj.from) ? obj.from : null;
  obj.to = isValidISODate(obj.to) ? obj.to : null;
  return obj;
}

async function classifyQuestionWithLLM(
  ai: Ai,
  message: string,
  todayIso: string
): Promise<IntentClassification> {
  const systemPrompt = [
    'Você é um classificador de intenções financeiras em português.',
    `Data de hoje em America/Sao_Paulo: ${todayIso}.`,
    'Classifique a pergunta do usuário em APENAS UM JSON com o seguinte formato:',
    '{',
    '  "intent": "total" | "by_category" | "top_expenses" | "compare_months" | "unknown",',
    '  "category": "Alimentação" | "Transporte" | "Educação" | "Lazer" | "Outros" | null,',
    '  "from": "YYYY-MM-DD" | null,',
    '  "to": "YYYY-MM-DD" | null',
    '}',
    'Regras:',
    '- "quanto gastei..." / "total de gastos..." -> intent: "total" (preencha category se mencionar categoria).',
    '- "gastos por categoria" / "distribuição..." -> intent: "by_category".',
    '- "maiores despesas" / "onde gastei mais" -> intent: "top_expenses".',
    '- "comparar meses" / "mês passado vs este mês" -> intent: "compare_months".',
    '- Se mencionar um mês específico (ex: "em outubro"), preencha from e to com o primeiro e último dia desse mês no ano mais recente aplicável.',
    '- Se não for uma consulta financeira sobre despesas, use intent: "unknown".',
    'Responda apenas JSON.',
  ].join('\n');

  const callModel = async (userPrompt: string) => {
    const res = await ai.run(
      AI_MODELS.TEXT as keyof AiModels,
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 250,
      } as Record<string, unknown>
    );
    return extractRawText(res);
  };

  const firstRaw = await callModel(message);
  try {
    const parsed = JSON.parse(stripJsonFence(firstRaw));
    return IntentClassificationSchema.parse(normalizeIntentPayload(parsed));
  } catch {
    try {
      const repairedRaw = await callModel(
        `Corrija para JSON válido no esquema {intent, category, from, to}. Original:\n${firstRaw.slice(
          0,
          600
        )}`
      );
      const parsed2 = JSON.parse(stripJsonFence(repairedRaw));
      return IntentClassificationSchema.parse(normalizeIntentPayload(parsed2));
    } catch {
      return { intent: 'unknown', category: null, from: null, to: null };
    }
  }
}

export const onRequestPost: PagesFunction<Env, string, AuthContextData> = async (
  context
) => {
  try {
    const db = requireDB(context.env);
    if (!context.env.AI) {
      return errorResponse(
        503,
        'AI_UNAVAILABLE',
        'A IA está indisponível agora. Tente novamente mais tarde.'
      );
    }

    const body = await context.request.json().catch(() => null);
    const parsedReq = ChatRequestSchema.safeParse(body);
    if (!parsedReq.success) {
      const msg = parsedReq.error.issues[0]?.message || 'Mensagem inválida.';
      return errorResponse(400, 'VALIDATION_ERROR', msg);
    }

    await checkAndIncrementAiUsage(db, context.data.userId);

    const todayIso = todaySaoPauloISO();
    const { from: defaultFrom, to: defaultTo, currYm, prevYm } =
      getMonthBounds(todayIso);

    let classified: IntentClassification;
    try {
      classified = await classifyQuestionWithLLM(
        context.env.AI,
        parsedReq.data.message,
        todayIso
      );
    } catch {
      return errorResponse(
        503,
        'AI_UNAVAILABLE',
        'A IA está indisponível agora (limite diário). Tente novamente mais tarde.'
      );
    }

    const fromDate = classified.from ?? defaultFrom;
    const toDate = classified.to ?? defaultTo;
    const periodLabel = `${formatDateBR(fromDate)} a ${formatDateBR(toDate)}`;

    if (classified.intent === 'total') {
      const row = classified.category
        ? await db
            .prepare(
              'SELECT COALESCE(SUM(amount_cents), 0) as total_cents, COUNT(*) as qty FROM expenses WHERE user_id = ? AND category = ? AND expense_date >= ? AND expense_date <= ?'
            )
            .bind(
              context.data.userId,
              classified.category,
              fromDate,
              toDate
            )
            .first<{ total_cents: number; qty: number }>()
        : await db
            .prepare(
              'SELECT COALESCE(SUM(amount_cents), 0) as total_cents, COUNT(*) as qty FROM expenses WHERE user_id = ? AND expense_date >= ? AND expense_date <= ?'
            )
            .bind(context.data.userId, fromDate, toDate)
            .first<{ total_cents: number; qty: number }>();

      const totalCents = Number(row?.total_cents ?? 0);
      const qty = Number(row?.qty ?? 0);
      const catText = classified.category
        ? ` na categoria ${classified.category}`
        : '';

      const reply =
        qty === 0
          ? `Não encontrei despesas registradas${catText} no período de ${periodLabel}.`
          : `Você gastou ${formatBRL(totalCents)}${catText} entre ${periodLabel} (${qty} ${
              qty === 1 ? 'lançamento' : 'lançamentos'
            }).`;

      return jsonResponse({
        intent: classified.intent,
        reply,
        structuredCard: {
          title: classified.category
            ? `Total em ${classified.category}`
            : 'Total de Despesas',
          subtitle: periodLabel,
          items: [
            { label: 'Valor acumulado', value: formatBRL(totalCents), tone: 'neutral' },
            { label: 'Lançamentos', value: String(qty), tone: 'neutral' },
          ],
        },
      });
    }

    if (classified.intent === 'by_category') {
      const { results } = await db
        .prepare(
          'SELECT category, COALESCE(SUM(amount_cents), 0) as total_cents FROM expenses WHERE user_id = ? AND expense_date >= ? AND expense_date <= ? GROUP BY category ORDER BY total_cents DESC'
        )
        .bind(context.data.userId, fromDate, toDate)
        .all<{ category: FixedCategory; total_cents: number }>();

      const rows = results ?? [];
      const grandTotal = rows.reduce((s, r) => s + Number(r.total_cents), 0);

      if (rows.length === 0) {
        return jsonResponse({
          intent: classified.intent,
          reply: `Ainda não há despesas registradas entre ${periodLabel} para agrupar por categoria.`,
        });
      }

      const leader = rows[0];
      return jsonResponse({
        intent: classified.intent,
        reply: `No período de ${periodLabel}, seus gastos somaram ${formatBRL(
          grandTotal
        )}, com maior concentração em ${leader.category} (${formatBRL(
          Number(leader.total_cents)
        )}).`,
        structuredCard: {
          title: 'Gastos por Categoria',
          subtitle: periodLabel,
          items: rows.map((r) => ({
            label: r.category,
            value: formatBRL(Number(r.total_cents)),
            tone: 'neutral' as const,
          })),
        },
        miniChart: rows.map((r) => ({
          label: r.category,
          value_cents: Number(r.total_cents),
        })),
      });
    }

    if (classified.intent === 'top_expenses') {
      const res = classified.category
        ? await db
            .prepare(
              'SELECT merchant, amount_cents, expense_date, category FROM expenses WHERE user_id = ? AND category = ? AND expense_date >= ? AND expense_date <= ? ORDER BY amount_cents DESC LIMIT 5'
            )
            .bind(context.data.userId, classified.category, fromDate, toDate)
            .all<{
              merchant: string;
              amount_cents: number;
              expense_date: string;
              category: string;
            }>()
        : await db
            .prepare(
              'SELECT merchant, amount_cents, expense_date, category FROM expenses WHERE user_id = ? AND expense_date >= ? AND expense_date <= ? ORDER BY amount_cents DESC LIMIT 5'
            )
            .bind(context.data.userId, fromDate, toDate)
            .all<{
              merchant: string;
              amount_cents: number;
              expense_date: string;
              category: string;
            }>();

      const rows = res.results ?? [];
      if (rows.length === 0) {
        return jsonResponse({
          intent: classified.intent,
          reply: `Nenhuma despesa registrada no período de ${periodLabel}.`,
        });
      }

      const top = rows[0];
      return jsonResponse({
        intent: classified.intent,
        reply: `Sua maior despesa entre ${periodLabel} foi ${top.merchant}, no valor de ${formatBRL(
          Number(top.amount_cents)
        )} em ${formatDateBR(top.expense_date)}.`,
        structuredCard: {
          title: 'Maiores Despesas',
          subtitle: periodLabel,
          items: rows.map((r) => ({
            label: `${r.merchant} (${formatDateBR(r.expense_date)})`,
            value: formatBRL(Number(r.amount_cents)),
            tone: 'neutral' as const,
          })),
        },
        miniChart: rows.map((r) => ({
          label: r.merchant.slice(0, 14),
          value_cents: Number(r.amount_cents),
        })),
      });
    }

    if (classified.intent === 'compare_months') {
      const m1 = classified.from ? classified.from.slice(0, 7) : prevYm;
      const m2 = classified.to ? classified.to.slice(0, 7) : currYm;
      const targetA = m1 === m2 ? prevYm : m1;
      const targetB = m2;

      const { results } = await db
        .prepare(
          "SELECT substr(expense_date, 1, 7) as ym, COALESCE(SUM(amount_cents), 0) as total_cents FROM expenses WHERE user_id = ? AND substr(expense_date, 1, 7) IN (?, ?) GROUP BY ym"
        )
        .bind(context.data.userId, targetA, targetB)
        .all<{ ym: string; total_cents: number }>();

      const map = new Map<string, number>();
      for (const r of results ?? []) {
        map.set(r.ym, Number(r.total_cents) || 0);
      }

      const valA = map.get(targetA) ?? 0;
      const valB = map.get(targetB) ?? 0;
      const diff = valB - valA;
      const diffTone: 'positive' | 'warning' | 'neutral' =
        diff < 0 ? 'positive' : diff > 0 ? 'warning' : 'neutral';

      return jsonResponse({
        intent: classified.intent,
        reply: `Em ${targetB} você gastou ${formatBRL(valB)} frente a ${formatBRL(
          valA
        )} em ${targetA} (${diff >= 0 ? '+' : '-'}${formatBRL(Math.abs(diff))}).`,
        structuredCard: {
          title: 'Comparativo Mensal',
          subtitle: `${targetA} vs. ${targetB}`,
          items: [
            { label: targetA, value: formatBRL(valA), tone: 'neutral' },
            { label: targetB, value: formatBRL(valB), tone: 'neutral' },
            {
              label: 'Diferença',
              value: `${diff >= 0 ? '+' : '-'}${formatBRL(Math.abs(diff))}`,
              tone: diffTone,
            },
          ],
        },
        miniChart: [
          { label: targetA, value_cents: valA },
          { label: targetB, value_cents: valB },
        ],
      });
    }

    return jsonResponse({
      intent: 'unknown',
      reply:
        'Não consegui identificar exatamente qual consulta financeira você deseja. Experimente perguntar de uma destas formas:',
      suggestions: [
        'Quanto gastei com Transporte este mês?',
        'Quais foram minhas maiores despesas do mês?',
        'Mostre meus gastos por categoria neste mês',
        'Compare meus gastos deste mês com o mês passado',
      ],
    });
  } catch (err) {
    if (err instanceof AiServiceError) {
      return errorResponse(err.status, err.code, err.message);
    }
    return errorResponse(
      500,
      'INTERNAL_ERROR',
      'Não foi possível processar a consulta no chat.'
    );
  }
};
