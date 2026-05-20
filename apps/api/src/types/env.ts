import type { DurableObjectNamespace, D1Database, KVNamespace, R2Bucket, Queue } from '@cloudflare/workers-types';

export interface Env {
  // Bindings
  DB: D1Database;
  KV: KVNamespace;
  DOCS_BUCKET: R2Bucket;
  ATTACHMENTS_BUCKET: R2Bucket;
  BACKUPS_BUCKET: R2Bucket;
  CHAT_ROOM: DurableObjectNamespace;
  RATE_LIMITER: DurableObjectNamespace;
  JOBS_QUEUE: Queue<JobMessage>;

  // Vars
  ENVIRONMENT: 'development' | 'staging' | 'production';
  ALLOWED_ORIGINS: string;
  ACCESS_TOKEN_TTL_SECONDS: string;
  REFRESH_TOKEN_TTL_SECONDS: string;
  REPORT_TTL_DAYS: string;
  AUDIT_RETENTION_DAYS: string;

  // Secrets (set via `wrangler secret put` or .dev.vars)
  JWT_SECRET: string;
  PASSWORD_PEPPER: string;
  ORG_MASTER_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  MAILCHANNELS_DKIM_PRIVATE_KEY: string;
}

export type JobMessage =
  | { kind: 'send_invite_email'; email: string; token: string; inviterName: string }
  | { kind: 'send_password_reset'; email: string; token: string }
  | { kind: 'purge_expired_reports' }
  | { kind: 'rotate_ip_salt' };

export type Role = 'staff' | 'manager' | 'hr' | 'admin' | 'owner';

export interface AuthedUser {
  id: string;
  email: string;
  role: Role;
  department: string | null;
}

export type AppContext = {
  Bindings: Env;
  Variables: {
    user?: AuthedUser;
    requestId: string;
    ipHash: string;
    userAgentHash: string;
  };
};
