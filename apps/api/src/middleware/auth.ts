import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyJwt } from '../lib/crypto';
import { getUserById } from '../lib/db';
import type { AppContext, Role } from '../types/env';

const ACCESS_COOKIE = 'mi_at';

export const requireAuth: MiddlewareHandler<AppContext> = async (c, next) => {
  const token = getCookie(c, ACCESS_COOKIE) ?? extractBearer(c.req.header('authorization'));
  if (!token) return c.json({ error: 'unauthenticated' }, 401);
  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ error: 'invalid_token' }, 401);

  const user = await getUserById(c.env.DB, payload.sub);
  if (!user || user.status !== 'active') return c.json({ error: 'user_inactive' }, 401);

  c.set('user', {
    id: user.id,
    email: user.email,
    role: user.role,
    department: user.department,
  });
  await next();
};

export function requireRole(...roles: Role[]): MiddlewareHandler<AppContext> {
  return async (c, next) => {
    const user = c.get('user');
    if (!user) return c.json({ error: 'unauthenticated' }, 401);
    if (!roles.includes(user.role)) return c.json({ error: 'forbidden' }, 403);
    await next();
  };
}

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

export const ACCESS_COOKIE_NAME = ACCESS_COOKIE;
export const REFRESH_COOKIE_NAME = 'mi_rt';
