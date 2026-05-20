import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import type { ExecutionContext, MessageBatch } from '@cloudflare/workers-types';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { chatRouter } from './routes/chat';
import { reportsRouter, adminReportsRouter } from './routes/reports';
import { docsRouter } from './routes/docs';
import { hrRouter } from './routes/hr';
import { adminRouter } from './routes/admin';
import { requestContext } from './middleware/context';
import { sendMail } from './lib/mail';
import { getOrCreateDailyIpSalt } from './lib/crypto';
import type { Env, JobMessage, AppContext } from './types/env';

export { ChatRoom } from './do/ChatRoom';
export { RateLimiter } from './do/RateLimiter';

const app = new Hono<AppContext>();

// ============================================================
// Global middleware
// ============================================================
app.use('*', secureHeaders({
  strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: { camera: [], microphone: [], geolocation: [] },
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
    connectSrc: ["'self'", 'wss:', 'https://challenges.cloudflare.com'],
    imgSrc: ["'self'", 'blob:', 'data:'],
    styleSrc: ["'self'", "'unsafe-inline'"],
    fontSrc: ["'self'", 'data:'],
    frameAncestors: ["'none'"],
    objectSrc: ["'none'"],
  },
}));

app.use('*', async (c, next) => {
  const allowed = c.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  return cors({
    origin: (origin) => (allowed.includes(origin) ? origin : null),
    credentials: true,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Device-Label'],
    exposeHeaders: ['Retry-After'],
    maxAge: 600,
  })(c, next);
});

app.use('*', requestContext);

// ============================================================
// Health
// ============================================================
app.get('/', (c) => c.json({ name: 'maranasi-api', env: c.env.ENVIRONMENT, time: Date.now() }));
app.get('/health', (c) => c.json({ ok: true }));

// ============================================================
// Routes
// ============================================================
app.route('/auth', authRouter);
app.route('/users', usersRouter);
app.route('/rooms', chatRouter);
app.route('/reports', reportsRouter);
app.route('/docs', docsRouter);
app.route('/hr', hrRouter);
app.route('/admin/reports', adminReportsRouter);
app.route('/admin', adminRouter);

// ============================================================
// 404
// ============================================================
app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'internal_error', requestId: c.get('requestId') }, 500);
});

// ============================================================
// Exports: fetch (HTTP), queue (jobs), scheduled (cron)
// ============================================================
export default {
  fetch: app.fetch,

  async queue(batch: MessageBatch<JobMessage>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        await handleJob(msg.body, env);
        msg.ack();
      } catch (err) {
        console.error('Job failed:', msg.body.kind, err);
        msg.retry();
      }
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Daily 03:00 UTC — rotate IP-hash salt (touch today's key), purge expired sessions
    ctx.waitUntil(dailyMaintenance(env));
    // Sunday 04:00 UTC — purge expired reports
    if (new Date(event.scheduledTime).getUTCDay() === 0) {
      ctx.waitUntil(weeklyMaintenance(env));
    }
  },
} satisfies ExportedHandler<Env>;

// ============================================================
// Job handlers
// ============================================================
async function handleJob(job: JobMessage, env: Env): Promise<void> {
  switch (job.kind) {
    case 'send_invite_email': {
      const subject = 'You are invited to Maranasi Intranet';
      const link = `${env.ALLOWED_ORIGINS.split(',')[0]}/signup?token=${encodeURIComponent(job.token)}`;
      const html = `
        <div style="font-family:Inter,sans-serif;line-height:1.6">
          <h2>أهلاً بك في Maranasi Intranet</h2>
          <p>Welcome to the Maranasi internal workspace.</p>
          <p>Set up your account here (link expires in 24 hours):</p>
          <p><a href="${link}">${link}</a></p>
          <p style="color:#666;font-size:12px">Invited by ${job.inviterName}</p>
        </div>`;
      await sendMail({
        to: job.email,
        subject,
        html,
        text: `Welcome to Maranasi Intranet.\nSet up your account: ${link}\n(Link expires in 24h.)`,
      });
      return;
    }
    case 'send_password_reset': {
      const link = `${env.ALLOWED_ORIGINS.split(',')[0]}/reset?token=${encodeURIComponent(job.token)}`;
      await sendMail({
        to: job.email,
        subject: 'Reset your Maranasi Intranet password',
        html: `<p>Reset link (expires in 1h): <a href="${link}">${link}</a></p>
               <p style="color:#a00"><strong>Important:</strong> resetting your password will permanently erase your encrypted chat history. This is by design.</p>`,
        text: `Reset link: ${link}\nNote: resetting will erase your encrypted chat history.`,
      });
      return;
    }
    case 'purge_expired_reports': {
      await env.DB.prepare(`DELETE FROM reports WHERE expires_at < ?`).bind(Date.now()).run();
      return;
    }
    case 'rotate_ip_salt': {
      await getOrCreateDailyIpSalt(env.KV);
      return;
    }
  }
}

async function dailyMaintenance(env: Env): Promise<void> {
  await getOrCreateDailyIpSalt(env.KV);
  await env.DB.prepare(`UPDATE sessions SET revoked_at = ? WHERE expires_at < ? AND revoked_at IS NULL`)
    .bind(Date.now(), Date.now()).run();
  // Purge audit log older than retention window
  const retentionDays = Number(env.AUDIT_RETENTION_DAYS) || 730;
  await env.DB.prepare(`DELETE FROM audit_log WHERE created_at < ?`)
    .bind(Date.now() - retentionDays * 24 * 60 * 60 * 1000).run();
  // Purge soft-deleted documents older than 30 days
  await env.DB.prepare(`DELETE FROM documents WHERE deleted_at IS NOT NULL AND deleted_at < ?`)
    .bind(Date.now() - 30 * 24 * 60 * 60 * 1000).run();
}

async function weeklyMaintenance(env: Env): Promise<void> {
  await env.DB.prepare(`DELETE FROM reports WHERE expires_at < ?`).bind(Date.now()).run();
  // Backup D1 snapshot to R2 — outline only; wrangler can also do this via API
}
