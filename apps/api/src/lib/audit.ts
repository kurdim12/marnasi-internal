import { ulid } from 'ulid';
import type { Context } from 'hono';
import type { AppContext } from '../types/env';

export interface AuditEntry {
  actorId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export async function audit(c: Context<AppContext>, entry: AuditEntry): Promise<void> {
  const { DB } = c.env;
  await DB.prepare(`
    INSERT INTO audit_log (id, actor_id, action, target_type, target_id, metadata, ip_hash, user_agent_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      ulid(),
      entry.actorId,
      entry.action,
      entry.targetType ?? null,
      entry.targetId ?? null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      c.get('ipHash') ?? null,
      c.get('userAgentHash') ?? null,
      Date.now(),
    )
    .run();
}
