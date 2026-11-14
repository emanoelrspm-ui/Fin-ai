import { z } from 'zod';
import { AiServiceError, parseExpenseTextWithAI } from '../../_lib/ai';
import { requireDB } from '../../_lib/db';
import { errorResponse, jsonResponse } from '../../_lib/responses';
import { AuthContextData, Env } from '../../_lib/types';

const ParseTextRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Informe uma descrição da despesa.')
    .max(300, 'O texto deve ter no máximo 300 caracteres.'),
});

export const onRequestPost: PagesFunction<Env, string, AuthContextData> = async (
  context
) => {
  try {
    requireDB(context.env);
    const body = await context.request.json().catch(() => null);
    const parsed = ParseTextRequestSchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Dados inválidos.';
      return errorResponse(400, 'VALIDATION_ERROR', msg);
    }

    const draft = await parseExpenseTextWithAI(
      context.env,
      context.data.userId,
      parsed.data.text
    );

    return jsonResponse({ draft });
  } catch (err) {
    if (err instanceof AiServiceError) {
      return errorResponse(err.status, err.code, err.message);
    }
    return errorResponse(
      500,
      'INTERNAL_ERROR',
      'Não foi possível interpretar a despesa por texto.'
    );
  }
};
