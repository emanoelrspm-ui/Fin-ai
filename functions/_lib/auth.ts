import { AuthContextData, Env } from './types';

interface SupabaseUserPayload {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
}

export class AuthError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function authenticateRequest(
  request: Request,
  env: Env
): Promise<AuthContextData> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError(
      401,
      'UNAUTHORIZED',
      'Token de autenticação ausente ou inválido.'
    );
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    throw new AuthError(
      401,
      'UNAUTHORIZED',
      'Token de autenticação não informado.'
    );
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new AuthError(
      500,
      'AUTH_CONFIG_MISSING',
      'Configuração de autenticação do servidor ausente.'
    );
  }

  const supabaseUrl = env.SUPABASE_URL.replace(/\/+$/, '');
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_ANON_KEY,
    },
  });

  if (!res.ok) {
    throw new AuthError(
      401,
      'INVALID_TOKEN',
      'Sessão expirada ou token inválido. Faça login novamente.'
    );
  }

  const user = (await res.json()) as SupabaseUserPayload;
  if (!user || !user.id) {
    throw new AuthError(
      401,
      'INVALID_USER',
      'Não foi possível identificar o usuário autenticado.'
    );
  }

  const email = user.email ?? '';
  const metadataName =
    user.user_metadata?.full_name?.trim() || user.user_metadata?.name?.trim();
  const fallbackName = email ? email.split('@')[0] : 'Usuário';

  return {
    userId: user.id,
    email,
    name: metadataName || fallbackName,
  };
}
