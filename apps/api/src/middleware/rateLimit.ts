import type { MiddlewareHandler } from 'hono';
import type { AppContext } from '../types/env';

/**
 * Sliding window rate limiter backed by the RateLimiter Durable Object.
 * Key = ipHash + ':' + bucket.
 */
export function rateLimit(opts: { bucket: string; max: number; windowMs: number }): MiddlewareHandler<AppContext> {
  return async (c, next) => {
    const ipHash = c.get('ipHash');
    const id = c.env.RATE_LIMITER.idFromName(opts.bucket);
    const stub = c.env.RATE_LIMITER.get(id);
    const res = await stub.fetch('https://rl/check', {
      method: 'POST',
      body: JSON.stringify({ key: `${ipHash}:${opts.bucket}`, max: opts.max, windowMs: opts.windowMs }),
    });
    const { allowed, retryAfter } = (await res.json()) as { allowed: boolean; retryAfter?: number };
    if (!allowed) {
      if (retryAfter) c.header('Retry-After', String(retryAfter));
      return c.json({ error: 'rate_limited' }, 429);
    }
    await next();
  };
}
