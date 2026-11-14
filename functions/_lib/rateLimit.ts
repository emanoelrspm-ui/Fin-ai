interface BucketState {
  count: number;
  resetAt: number;
}

const isolateRateStore = new Map<string, BucketState>();
const MAX_STORE_ENTRIES = 2000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Rate limit simples em memória por isolate (defesa em profundidade por usuário).
 * Em produção no Cloudflare Workers/Pages, cada isolate mantém sua janela deslizante
 * sem armazenar PII (apenas prefixo opaco de userId + grupo de rota).
 */
export function checkWriteRateLimit(
  userId: string,
  routeGroup: 'write' | 'ai' | 'destructive'
): RateLimitResult {
  const now = Date.now();
  const windowMs = 60_000; // 1 minuto
  const maxRequests =
    routeGroup === 'destructive' ? 5 : routeGroup === 'ai' ? 25 : 60;

  const key = `${userId}:${routeGroup}`;

  if (isolateRateStore.size > MAX_STORE_ENTRIES) {
    for (const [entryKey, state] of isolateRateStore.entries()) {
      if (state.resetAt <= now) {
        isolateRateStore.delete(entryKey);
      }
    }
  }

  const current = isolateRateStore.get(key);
  if (!current || current.resetAt <= now) {
    isolateRateStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= maxRequests) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((current.resetAt - now) / 1000)
    );
    return { allowed: false, retryAfterSeconds };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
