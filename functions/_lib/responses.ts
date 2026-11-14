import { ApiErrorBody } from './types';

export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function errorResponse(
  status: number,
  code: string,
  message: string
): Response {
  const body: ApiErrorBody = {
    error: { code, message },
  };
  return jsonResponse(body, status);
}
