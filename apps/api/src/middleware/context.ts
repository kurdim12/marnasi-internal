import type { MiddlewareHandler } from 'hono';
import { ulid } from 'ulid';
import { getOrCreateDailyIpSalt, hashIp } from '../lib/crypto';
import type { AppContext } from '../types/env';

/**
 * Populates c.var with requestId, ipHash, userAgentHash for the audit log.
 * The raw IP and UA are never persisted — only daily-salted hashes.
 */
export const requestContext: MiddlewareHandler<AppContext> = async (c, next) => {
  c.set('requestId', ulid());
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'unknown';
  const ua = c.req.header('user-agent') ?? 'unknown';
  const salt = await getOrCreateDailyIpSalt(c.env.KV);
  c.set('ipHash', await hashIp(ip, salt));
  c.set('userAgentHash', await hashIp(ua, salt));
  await next();
};
