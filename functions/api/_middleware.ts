import { authenticateRequest, AuthError } from '../_lib/auth';
import { errorResponse } from '../_lib/responses';
import { AuthContextData, Env } from '../_lib/types';

export const onRequest: PagesFunction<Env, string, AuthContextData> = async (
  context
) => {
  try {
    const authData = await authenticateRequest(context.request, context.env);
    context.data.userId = authData.userId;
    context.data.email = authData.email;
    context.data.name = authData.name;
    return await context.next();
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.status, err.code, err.message);
    }
    const message =
      err instanceof Error
        ? err.message
        : 'Erro interno na validação da requisição.';
    return errorResponse(500, 'INTERNAL_ERROR', message);
  }
};
