import { AiServiceError, parseExpenseImageWithAI } from '../../_lib/ai';
import { requireDB } from '../../_lib/db';
import { errorResponse, jsonResponse } from '../../_lib/responses';
import { AuthContextData, Env } from '../../_lib/types';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB

interface DetectedImageType {
  mime: 'image/jpeg' | 'image/png' | 'image/webp';
  ext: 'jpg' | 'png' | 'webp';
}

function detectImageTypeFromBytes(buffer: ArrayBuffer): DetectedImageType | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' };
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  return null;
}

export const onRequestPost: PagesFunction<Env, string, AuthContextData> = async (
  context
) => {
  try {
    requireDB(context.env);
    if (!context.env.BUCKET) {
      return errorResponse(
        503,
        'STORAGE_UNAVAILABLE',
        'Armazenamento R2 não configurado neste ambiente.'
      );
    }

    const contentType = context.request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return errorResponse(
        400,
        'INVALID_CONTENT_TYPE',
        'Envie o arquivo no formato multipart/form-data com o campo "image".'
      );
    }

    const formData = await context.request.formData();
    const imageField = formData.get('image');

    if (!imageField || !(imageField instanceof File)) {
      return errorResponse(
        400,
        'MISSING_IMAGE',
        'Arquivo não encontrado no campo "image".'
      );
    }

    if (imageField.size === 0) {
      return errorResponse(400, 'EMPTY_IMAGE', 'O arquivo enviado está vazio.');
    }

    if (imageField.size > MAX_IMAGE_BYTES) {
      return errorResponse(
        400,
        'IMAGE_TOO_LARGE',
        'A imagem deve ter no máximo 4 MB.'
      );
    }

    const buffer = await imageField.arrayBuffer();
    const detected = detectImageTypeFromBytes(buffer);
    if (!detected) {
      return errorResponse(
        400,
        'UNSUPPORTED_IMAGE_TYPE',
        'Formato inválido. Envie apenas imagens JPEG, PNG ou WebP.'
      );
    }

    const receiptKey = `receipts/${context.data.userId}/${crypto.randomUUID()}.${detected.ext}`;

    await context.env.BUCKET.put(receiptKey, buffer, {
      httpMetadata: {
        contentType: detected.mime,
      },
      customMetadata: {
        userId: context.data.userId,
      },
    });

    const draft = await parseExpenseImageWithAI(
      context.env,
      context.data.userId,
      buffer,
      detected.mime
    );

    return jsonResponse({
      draft,
      receipt_key: receiptKey,
    });
  } catch (err) {
    if (err instanceof AiServiceError) {
      return errorResponse(err.status, err.code, err.message);
    }
    return errorResponse(
      500,
      'INTERNAL_ERROR',
      'Não foi possível processar a imagem do comprovante.'
    );
  }
};
