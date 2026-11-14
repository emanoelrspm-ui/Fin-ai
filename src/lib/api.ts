import { supabase } from './supabase';

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface MeResponse {
  id: string;
  email: string;
  name: string;
}

let onUnauthorizedCallback: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void): void {
  onUnauthorizedCallback = handler;
}

async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
    );
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (response.status === 401) {
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
    if (isJson) {
      const payload = (await response.json().catch(() => null)) as {
        error?: { code?: string; message?: string };
      } | null;
      throw new ApiError(
        401,
        payload?.error?.code || 'UNAUTHORIZED',
        payload?.error?.message || 'Sua sessão expirou. Entre novamente.'
      );
    }
    throw new ApiError(401, 'UNAUTHORIZED', 'Sua sessão expirou. Entre novamente.');
  }

  if (!isJson) {
    throw new ApiError(
      response.status || 503,
      'UNAVAILABLE_API',
      'API Cloudflare indisponível neste ambiente de preview. Execute os testes no deploy da Cloudflare.'
    );
  }

  const payload = await response.json();

  if (!response.ok) {
    const errObj = (payload as { error?: { code?: string; message?: string } })
      ?.error;
    throw new ApiError(
      response.status,
      errObj?.code || 'API_ERROR',
      errObj?.message || 'Ocorreu um erro ao processar sua solicitação.'
    );
  }

  return payload as T;
}

export const api = {
  getMe: () => apiFetch<MeResponse>('/api/me'),
};
