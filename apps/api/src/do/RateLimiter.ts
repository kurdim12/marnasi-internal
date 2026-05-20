import { DurableObject } from 'cloudflare:workers';

/**
 * Sliding window rate limiter. One DO instance per bucket (per IP-hash via
 * idFromName). Stores timestamps in DO storage so it survives restarts.
 *
 * Memory hygiene: prune older-than-window timestamps on every check.
 */
export class RateLimiter extends DurableObject {
  async fetch(req: Request): Promise<Response> {
    const { key, max, windowMs } = await req.json<{ key: string; max: number; windowMs: number }>();
    const now = Date.now();
    const cutoff = now - windowMs;
    const stored = (await this.ctx.storage.get<number[]>(key)) ?? [];
    const recent = stored.filter((t) => t > cutoff);
    if (recent.length >= max) {
      const oldest = recent[0]!;
      const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
      return Response.json({ allowed: false, retryAfter });
    }
    recent.push(now);
    await this.ctx.storage.put(key, recent);
    // Self-cleanup: schedule eviction beyond window
    await this.ctx.storage.setAlarm(now + windowMs + 60_000);
    return Response.json({ allowed: true });
  }

  override async alarm(): Promise<void> {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const all = await this.ctx.storage.list<number[]>();
    for (const [k, v] of all) {
      const recent = v.filter((t) => t > cutoff);
      if (recent.length === 0) await this.ctx.storage.delete(k);
      else if (recent.length !== v.length) await this.ctx.storage.put(k, recent);
    }
  }
}
