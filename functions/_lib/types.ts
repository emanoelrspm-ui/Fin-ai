export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  AI: Ai;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

export interface AuthContextData extends Record<string, unknown> {
  userId: string;
  email: string;
  name: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
