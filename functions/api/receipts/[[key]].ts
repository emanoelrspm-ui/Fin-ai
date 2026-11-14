import { errorResponse } from '../../_lib/responses';
import { AuthContextData, Env } from '../../_lib/types';
import { isUserReceiptKey } from '../../_lib/validation';

export const onRequestGet: PagesFunction<Env, 'key', AuthContextData> = async (
  context
) => {
  try {
    if (!context.env.BUCKET) {
      return errorResponse(
        503,
        'STORAGE_UNAVAILABLE',
        'Armazenamento R2 não configurado neste ambiente.'
      );
    }

    const rawParam = context.params.key;
    const joined = Array.isArray(rawParam) ? rawParam.join('/') : rawParam || '';
    let receiptKey = '';
    try {
      receiptKey = decodeURIComponent(joined).replace(/^\/+/, '');
    } catch {
      return errorResponse(404, 'NOT_FOUND', 'Comprovante não encontrado.');
    }

    // Rotas de outros usuários devem retornar 404 (sem vazamento cross-tenant)
    if (!isUserReceiptKey(context.data.userId, receiptKey)) {
      return errorResponse(404, 'NOT_FOUND', 'Comprovante não encontrado.');
    }

    const object = await context.env.BUCKET.get(receiptKey);
    if (!object) {
      return errorResponse(
        404,
        'RECEIPT_NOT_FOUND',
        'Comprovante não encontrado.'
      );
    }

    const headers = new Headers();
    headers.set(
      'Content-Type',
      object.httpMetadata?.contentType || 'image/jpeg'
    );
    headers.set('Cache-Control', 'no-store');
    headers.set('X-Content-Type-Options', 'nosniff');

    return new Response(object.body, {
      status: 200,
      headers,
    });
  } catch {
    return errorResponse(
      500,
      'INTERNAL_ERROR',
      'Não foi possível carregar o comprovante.'
    );
  }
};
