import { Env } from './types';

export function requireDB(env: Env): D1Database {
  if (!env.DB) {
    throw new Error('Binding D1 "DB" não configurado neste ambiente.');
  }
  return env.DB;
}
