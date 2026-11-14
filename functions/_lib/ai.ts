import { z } from 'zod';
import { findMerchantRuleCategory, getTableColumns } from './db';
import {
  AI_DAILY_LIMIT,
  AI_MODELS,
  VISION_LICENSE_ACCEPT_PROMPT,
} from './models';
import { Env } from './types';
import {
  FIXED_CATEGORIES,
  FixedCategory,
  isValidCategory,
  isValidISODate,
} from './validation';

const ConfidenceSchema = z.object({
  merchant: z.number().min(0).max(1),
  amount: z.number().min(0).max(1),
  date: z.number().min(0).max(1),
  category: z.number().min(0).max(1),
});

export const AiExpenseDraftSchema = z.object({
  merchant: z.string().nullable(),
  amount_cents: z.number().int().positive().nullable(),
  expense_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  category: z.enum(FIXED_CATEGORIES),
  confidence: ConfidenceSchema,
});

export type AiExpenseDraft = z.infer<typeof AiExpenseDraftSchema>;

export const EMPTY_AI_DRAFT: AiExpenseDraft = {
  merchant: null,
  amount_cents: null,
  expense_date: null,
  category: 'Outros',
  confidence: {
    merchant: 0,
    amount: 0,
    date: 0,
    category: 0,
  },
};

export class AiServiceError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
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

function getSaoPauloWeekday(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
  }).format(new Date());
}

export function buildExpenseSystemPrompt(): string {
  const today = todaySaoPauloISO();
  const weekday = getSaoPauloWeekday();

  return [
    'Você é um extrator de despesas financeiras em português do Brasil.',
    `Data de hoje em America/Sao_Paulo: ${today} (${weekday}). Use esta referência para resolver expressões como "hoje", "ontem", "anteontem", "sexta passada" etc.`,
    '',
    'Categorias permitidas (use exatamente uma destas strings):',
    '- "Alimentação": mercado, supermercado, restaurante, almoço, jantar, lanchonete, iFood, padaria, café.',
    '- "Transporte": Uber, 99, táxi, combustível, gasolina, etanol, posto, ônibus, metrô, pedágio, estacionamento.',
    '- "Educação": escola, faculdade, curso, livros, apostila, mensalidade escolar, treinamento.',
    '- "Lazer": cinema, streaming, Netflix, Spotify, bar, show, viagem, hotel, jogos.',
    '- "Outros": farmácia, contas de casa, serviços, vestuário e quaisquer demais gastos.',
    '',
    'Regras para valores monetários brasileiros (sempre retornar em centavos inteiros positivos):',
    '- "1.234,56" -> 123456',
    '- "R$ 32,50" -> 3250',
    '- "32 reais" ou "32" -> 3200',
    '- "18,90" -> 1890',
    '',
    'Formato obrigatório de saída (responda apenas JSON, sem markdown, sem comentários):',
    '{',
    '  "merchant": string | null,',
    '  "amount_cents": number | null,',
    '  "expense_date": "YYYY-MM-DD" | null,',
    '  "category": "Alimentação" | "Transporte" | "Educação" | "Lazer" | "Outros",',
    '  "confidence": { "merchant": 0..1, "amount": 0..1, "date": 0..1, "category": 0..1 }',
    '}',
    'Se algum campo não estiver presente ou não for possível ler com segurança, retorne null para o campo e confidence 0 para ele. Nunca invente valores.',
  ].join('\n');
}

export async function checkAndIncrementAiUsage(
  db: D1Database,
  userId: string
): Promise<{ day: string; count: number }> {
  const day = todaySaoPauloISO();
  const cols = await getTableColumns(db, 'ai_usage');
  const countCol = cols.has('count')
    ? 'count'
    : cols.has('calls')
    ? 'calls'
    : cols.has('request_count')
    ? 'request_count'
    : 'count';

  const existing = await db
    .prepare(
      `SELECT ${countCol} as usage_count FROM ai_usage WHERE user_id = ? AND day = ?`
    )
    .bind(userId, day)
    .first<{ usage_count: number }>();

  const currentCount = existing?.usage_count ?? 0;
  if (currentCount >= AI_DAILY_LIMIT) {
    throw new AiServiceError(
      429,
      'AI_LIMIT',
      'Limite diário de 40 chamadas de IA atingido. Preencha manualmente.'
    );
  }

  if (existing) {
    await db
      .prepare(
        `UPDATE ai_usage SET ${countCol} = ${countCol} + 1 WHERE user_id = ? AND day = ?`
      )
      .bind(userId, day)
      .run();
  } else {
    const hasId = cols.has('id');
    if (hasId) {
      await db
        .prepare(
          `INSERT INTO ai_usage (id, user_id, day, ${countCol}) VALUES (?, ?, ?, 1)`
        )
        .bind(crypto.randomUUID(), userId, day)
        .run();
    } else {
      await db
        .prepare(
          `INSERT INTO ai_usage (user_id, day, ${countCol}) VALUES (?, ?, 1)`
        )
        .bind(userId, day)
        .run();
    }
  }

  return { day, count: currentCount + 1 };
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

  if (typeof obj.result === 'string') return obj.result;
  return JSON.stringify(aiResult);
}

function stripJsonCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) return fenced[1].trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

function normalizeCandidateObject(rawObj: unknown): unknown {
  if (!rawObj || typeof rawObj !== 'object') return rawObj;
  const obj = { ...(rawObj as Record<string, unknown>) };

  if (typeof obj.merchant === 'string') {
    const clean = obj.merchant.replace(/\s+/g, ' ').trim();
    obj.merchant = clean.length > 0 ? clean.slice(0, 120) : null;
  } else {
    obj.merchant = null;
  }

  if (typeof obj.amount_cents === 'string') {
    const digits = obj.amount_cents.replace(/[^\d]/g, '');
    obj.amount_cents = digits ? Number(digits) : null;
  }
  if (
    typeof obj.amount_cents !== 'number' ||
    !Number.isFinite(obj.amount_cents) ||
    obj.amount_cents <= 0
  ) {
    obj.amount_cents = null;
  } else {
    obj.amount_cents = Math.round(obj.amount_cents);
  }

  if (typeof obj.expense_date === 'string') {
    const trimmedDate = obj.expense_date.trim();
    obj.expense_date = isValidISODate(trimmedDate) ? trimmedDate : null;
  } else {
    obj.expense_date = null;
  }

  if (!isValidCategory(obj.category)) {
    obj.category = 'Outros';
  }

  const confRaw =
    obj.confidence && typeof obj.confidence === 'object'
      ? (obj.confidence as Record<string, unknown>)
      : {};
  const clamp = (v: unknown, fallback: number) => {
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(1, n));
  };

  obj.confidence = {
    merchant: obj.merchant ? clamp(confRaw.merchant, 0.7) : 0,
    amount: obj.amount_cents ? clamp(confRaw.amount, 0.7) : 0,
    date: obj.expense_date ? clamp(confRaw.date, 0.7) : 0,
    category: clamp(confRaw.category, 0.7),
  };

  return obj;
}

async function runTextCompletion(
  ai: Ai,
  messages: Array<{ role: 'system' | 'user'; content: string }>
): Promise<string> {
  const inputWithJsonFormat = {
    messages,
    temperature: 0.1,
    max_tokens: 400,
    response_format: { type: 'json_object' },
  };

  try {
    const result = await ai.run(
      AI_MODELS.TEXT as keyof AiModels,
      inputWithJsonFormat as Record<string, unknown>
    );
    return extractRawText(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    if (msg.includes('response_format') || msg.includes('schema')) {
      const fallbackResult = await ai.run(
        AI_MODELS.TEXT as keyof AiModels,
        {
          messages,
          temperature: 0.1,
          max_tokens: 400,
        } as Record<string, unknown>
      );
      return extractRawText(fallbackResult);
    }
    throw err;
  }
}

async function validateOrRepairDraft(
  ai: Ai,
  rawOutput: string
): Promise<AiExpenseDraft> {
  const tryParse = (text: string) => {
    const cleaned = stripJsonCodeFence(text);
    const parsedJson = JSON.parse(cleaned);
    const normalized = normalizeCandidateObject(parsedJson);
    return AiExpenseDraftSchema.parse(normalized);
  };

  try {
    return tryParse(rawOutput);
  } catch (firstErr) {
    try {
      const repairPrompt = [
        'O JSON abaixo está inválido ou fora do esquema exigido.',
        'Corrija e retorne APENAS um objeto JSON válido com as chaves:',
        'merchant (string|null), amount_cents (inteiro positivo|null), expense_date ("YYYY-MM-DD"|null), category ("Alimentação"|"Transporte"|"Educação"|"Lazer"|"Outros"), confidence ({ merchant, amount, date, category } números de 0 a 1).',
        'Não invente valores ausentes; use null e confiança 0.',
        `Erro de validação: ${firstErr instanceof Error ? firstErr.message : 'JSON inválido'}`,
        `Conteúdo original:\n${rawOutput.slice(0, 1200)}`,
      ].join('\n');

      const repairedText = await runTextCompletion(ai, [
        { role: 'system', content: 'Responda apenas JSON válido.' },
        { role: 'user', content: repairPrompt },
      ]);
      return tryParse(repairedText);
    } catch {
      return { ...EMPTY_AI_DRAFT };
    }
  }
}

async function applyMerchantRules(
  db: D1Database,
  userId: string,
  draft: AiExpenseDraft
): Promise<AiExpenseDraft> {
  const ruleCategory: FixedCategory | null = await findMerchantRuleCategory(
    db,
    userId,
    draft.merchant
  );
  if (!ruleCategory) return draft;

  return {
    ...draft,
    category: ruleCategory,
    confidence: {
      ...draft.confidence,
      category: 1,
    },
  };
}

function isQuotaOrUnavailableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    msg.includes('quota') ||
    msg.includes('neuron') ||
    msg.includes('rate limit') ||
    msg.includes('capacity') ||
    msg.includes('unavailable') ||
    msg.includes('timeout') ||
    msg.includes('429') ||
    msg.includes('503')
  );
}

function isVisionLicenseError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    msg.includes('5016') ||
    msg.includes('license') ||
    msg.includes('agree') ||
    msg.includes('terms')
  );
}

export async function parseExpenseTextWithAI(
  env: Env,
  userId: string,
  text: string
): Promise<AiExpenseDraft> {
  if (!env.AI) {
    throw new AiServiceError(
      503,
      'AI_UNAVAILABLE',
      'A IA está indisponível agora (limite diário). Preencha manualmente.'
    );
  }

  await checkAndIncrementAiUsage(env.DB, userId);

  try {
    const raw = await runTextCompletion(env.AI, [
      { role: 'system', content: buildExpenseSystemPrompt() },
      {
        role: 'user',
        content: `Extraia os dados da despesa descrita pelo usuário:\n"${text}"`,
      },
    ]);

    const draft = await validateOrRepairDraft(env.AI, raw);
    return await applyMerchantRules(env.DB, userId, draft);
  } catch (err) {
    if (err instanceof AiServiceError) throw err;
    if (isQuotaOrUnavailableError(err)) {
      throw new AiServiceError(
        503,
        'AI_UNAVAILABLE',
        'A IA está indisponível agora (limite diário). Preencha manualmente.'
      );
    }
    throw new AiServiceError(
      503,
      'AI_UNAVAILABLE',
      'A IA está indisponível agora (limite diário). Preencha manualmente.'
    );
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

async function runVisionCompletion(
  ai: Ai,
  imageBytes: ArrayBuffer,
  mimeType: string
): Promise<string> {
  const base64 = arrayBufferToBase64(imageBytes);
  const dataUri = `data:${mimeType};base64,${base64}`;
  const systemPrompt = buildExpenseSystemPrompt();
  const userInstruction =
    'Leia este cupom fiscal ou comprovante de pagamento brasileiro. Extraia estabelecimento (merchant), valor total pago em centavos (amount_cents), data da compra (expense_date em YYYY-MM-DD) e categoria. Responda apenas JSON.';

  const callModel = async () => {
    const payload = {
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userInstruction },
            { type: 'image_url', image_url: { url: dataUri } },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.1,
    };
    const res = await ai.run(
      AI_MODELS.VISION as keyof AiModels,
      payload as Record<string, unknown>
    );
    return extractRawText(res);
  };

  try {
    return await callModel();
  } catch (err) {
    if (isVisionLicenseError(err)) {
      // Chamada única de aceite da licença Meta Llama 3.2 Vision na Cloudflare
      await ai.run(
        AI_MODELS.VISION as keyof AiModels,
        { prompt: VISION_LICENSE_ACCEPT_PROMPT } as Record<string, unknown>
      );
      return await callModel();
    }
    throw err;
  }
}

export async function parseExpenseImageWithAI(
  env: Env,
  userId: string,
  imageBytes: ArrayBuffer,
  mimeType: string
): Promise<AiExpenseDraft> {
  if (!env.AI) {
    throw new AiServiceError(
      503,
      'AI_UNAVAILABLE',
      'A IA está indisponível agora (limite diário). Preencha manualmente.'
    );
  }

  await checkAndIncrementAiUsage(env.DB, userId);

  try {
    const raw = await runVisionCompletion(env.AI, imageBytes, mimeType);
    const draft = await validateOrRepairDraft(env.AI, raw);
    return await applyMerchantRules(env.DB, userId, draft);
  } catch (err) {
    if (err instanceof AiServiceError) throw err;
    throw new AiServiceError(
      503,
      'AI_UNAVAILABLE',
      'A IA está indisponível agora (limite diário). Preencha manualmente.'
    );
  }
}
