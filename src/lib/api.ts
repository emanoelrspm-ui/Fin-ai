import {
  AiExpenseDraft,
  CategoryBudgetProgress,
  ExpenseCategory,
  ExpenseSource,
  InsightsResponse,
  MiniChartPoint,
  PaymentMethod,
  StructuredCard,
  Transaction,
} from '../types/finance';
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

export interface ApiExpensePayload {
  id: string;
  merchant: string;
  amount_cents: number;
  expense_date: string;
  category: ExpenseCategory;
  payment_method: PaymentMethod;
  source: ExpenseSource;
  ai_confidence?: number | null;
  receipt_key?: string | null;
}

export interface CreateExpenseInput {
  merchant: string;
  amount_cents: number;
  expense_date: string;
  category: ExpenseCategory;
  payment_method?: PaymentMethod;
  source?: ExpenseSource;
  ai_confidence?:
    | number
    | {
        merchant: number;
        amount: number;
        date: number;
        category: number;
      }
    | null;
  receipt_key?: string | null;
}

export interface ChatApiResponse {
  intent: string;
  reply: string;
  structuredCard?: StructuredCard;
  miniChart?: MiniChartPoint[];
  suggestions?: string[];
}

function mapApiExpenseToTransaction(row: ApiExpensePayload): Transaction {
  return {
    id: row.id,
    title: row.merchant,
    amountCents: row.amount_cents,
    category: row.category,
    paymentMethod: row.payment_method || 'Débito',
    date: row.expense_date,
    source: row.source || 'manual',
    aiConfidence: row.ai_confidence ?? null,
    receiptKey: row.receipt_key ?? null,
  };
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

  listExpenses: async (): Promise<Transaction[]> => {
    const data = await apiFetch<{ expenses: ApiExpensePayload[] }>('/api/expenses');
    return (data.expenses ?? []).map(mapApiExpenseToTransaction);
  },

  createExpense: async (input: CreateExpenseInput): Promise<Transaction> => {
    const data = await apiFetch<{ expense: ApiExpensePayload }>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return mapApiExpenseToTransaction(data.expense);
  },

  updateExpense: async (
    id: string,
    input: Partial<CreateExpenseInput>
  ): Promise<void> => {
    await apiFetch(`/api/expenses/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  deleteExpense: async (id: string): Promise<void> => {
    await apiFetch(`/api/expenses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  parseTextExpense: (text: string) =>
    apiFetch<{ draft: AiExpenseDraft }>('/api/ai/parse-text', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  parseImageExpense: (imageFile: File) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return apiFetch<{ draft: AiExpenseDraft; receipt_key: string }>(
      '/api/ai/parse-image',
      {
        method: 'POST',
        body: formData,
      }
    );
  },

  fetchReceiptObjectUrl: async (receiptKey: string): Promise<string> => {
    const token = await getAccessToken();
    const encodedPath = receiptKey
      .split('/')
      .map((seg) => encodeURIComponent(seg))
      .join('/');
    const res = await fetch(`/api/receipts/${encodedPath}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new ApiError(
        res.status,
        'RECEIPT_LOAD_ERROR',
        'Não foi possível carregar o comprovante privado.'
      );
    }
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new ApiError(
        503,
        'UNAVAILABLE_API',
        'Armazenamento R2 indisponível neste ambiente de preview.'
      );
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  getBudgets: (month: string) =>
    apiFetch<{ month: string; budgets: CategoryBudgetProgress[] }>(
      `/api/budgets?month=${encodeURIComponent(month)}`
    ),

  upsertBudget: (
    category: ExpenseCategory,
    limit_cents: number,
    month: string
  ) =>
    apiFetch<{ budget: { category: ExpenseCategory; limit_cents: number; month: string } }>(
      '/api/budgets',
      {
        method: 'PUT',
        body: JSON.stringify({ category, limit_cents, month }),
      }
    ),

  getInsights: (month: string) =>
    apiFetch<InsightsResponse>(`/api/insights?month=${encodeURIComponent(month)}`),

  sendChat: (message: string) =>
    apiFetch<ChatApiResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  downloadCsv: async (from?: string, to?: string): Promise<void> => {
    const token = await getAccessToken();
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    const url = `/api/export.csv${qs ? `?${qs}` : ''}`;

    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.status === 401) {
      if (onUnauthorizedCallback) onUnauthorizedCallback();
      throw new ApiError(401, 'UNAUTHORIZED', 'Sua sessão expirou. Entre novamente.');
    }
    if (!res.ok || contentType.includes('text/html')) {
      if (contentType.includes('application/json')) {
        const errPayload = (await res.json().catch(() => null)) as {
          error?: { code?: string; message?: string };
        } | null;
        throw new ApiError(
          res.status,
          errPayload?.error?.code || 'EXPORT_ERROR',
          errPayload?.error?.message || 'Erro ao exportar CSV.'
        );
      }
      throw new ApiError(
        res.status || 503,
        'UNAVAILABLE_API',
        'Exportação CSV indisponível neste ambiente de preview.'
      );
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `finai-despesas${from ? `-${from}` : ''}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  },

  deleteAllUserData: () =>
    apiFetch<{ deleted: boolean; receipts_deleted: number }>('/api/account/data', {
      method: 'DELETE',
    }),
};
