import { authenticateRequest, AuthError } from '../_lib/auth';
import { checkWriteRateLimit } from '../_lib/rateLimit';
import { errorResponse } from '../_lib/responses';
import { AuthContextData, Env } from '../_lib/types';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function withApiSecurityHeaders(res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export const onRequest: PagesFunction<Env, string, AuthContextData> = async (
  context
) => {
  try {
    const authData = await authenticateRequest(context.request, context.env);
    context.data.userId = authData.userId;
    context.data.email = authData.email;
    context.data.name = authData.name;

    if (WRITE_METHODS.has(context.request.method.toUpperCase())) {
      const pathname = new URL(context.request.url).pathname;
      const routeGroup =
        pathname.startsWith('/api/ai/') || pathname === '/api/chat'
          ? 'ai'
          : pathname === '/api/account/data'
          ? 'destructive'
          : 'write';

      const rl = checkWriteRateLimit(authData.userId, routeGroup);
      if (!rl.allowed) {
        return errorResponse(
          429,
          'RATE_LIMITED',
          'Muitas requisições em sequência. Aguarde alguns segundos e tente novamente.',
          { 'Retry-After': String(rl.retryAfterSeconds) }
        );
      }
    }

    const res = await context.next();
    return withApiSecurityHeaders(res);
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.status, err.code, err.message);
    }
    return errorResponse(
      500,
      'INTERNAL_ERROR',
      'Erro interno ao processar sua solicitação.'
    );
  }
};
