'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useI18n } from '@/lib/i18n';
import { reports, ApiError } from '@/lib/api-client';
import { hybridEncryptToPubkey } from '@/lib/crypto/keys';
import { fromBase64, toBase64, utf8 } from '@/lib/crypto/encoding';
import { LanguageToggle } from '@/components/LanguageToggle';

// Tracking-code alphabet matches the server (no 0/O/1/I).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateTrackingCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
    if (i === 3 || i === 7) out += '-';
  }
  return out;
}

type Stage = 'compose' | 'submitting' | 'done';

export default function ReportPage() {
  const { t, dir } = useI18n();
  const [stage, setStage] = useState<Stage>('compose');
  const [category, setCategory] = useState<'harassment' | 'safety' | 'financial' | 'other'>('safety');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hrKey, setHrKey] = useState<{ id: number; publicKey: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    reports.hrKey().then(setHrKey).catch(() => setErr('Unable to load HR key.'));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!hrKey) return;
    setErr(null);
    setStage('submitting');
    try {
      const aesKeyRaw = crypto.getRandomValues(new Uint8Array(32));
      const aesKey = await crypto.subtle.importKey('raw', aesKeyRaw, { name: 'AES-GCM' }, false, ['encrypt']);

      // Encrypt each field with the same AES key, separate IVs
      async function aesEncrypt(plaintext: string): Promise<string> {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, utf8(plaintext)));
        const out = new Uint8Array(iv.length + ct.length);
        out.set(iv);
        out.set(ct, iv.length);
        return toBase64(out);
      }
      const titleEncrypted = await aesEncrypt(subject);
      const bodyEncrypted = await aesEncrypt(body);

      // Wrap the AES key with HR's X25519 pubkey (hybrid encryption).
      // Server stores ephemeralPubkey separately; wrappedAesKey is iv||ct.
      const wrapped = await hybridEncryptToPubkey(aesKeyRaw, fromBase64(hrKey.publicKey));

      const code = generateTrackingCode();
      const turnstileToken = await getTurnstileToken();

      await reports.submit({
        category,
        severity,
        hrKeyId: hrKey.id,
        ephemeralPubkey: toBase64(wrapped.ephemeralPubkey),
        wrappedAesKey: toBase64(concatIvAndCt(wrapped.iv, wrapped.ciphertext)),
        titleEncrypted,
        bodyEncrypted,
        trackingCode: code,
        turnstileToken,
      });

      setTrackingCode(code);
      setStage('done');
    } catch (e) {
      setErr(e instanceof ApiError ? e.code : 'submission_failed');
      setStage('compose');
    }
  }

  if (stage === 'done' && trackingCode) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6" dir={dir}>
        <div className="card space-y-5">
          <h2 className="text-2xl font-semibold text-emerald-900">{t.reports.submit.success.title}</h2>
          <p className="text-sm text-ink-950/70">{t.reports.submit.success.code}</p>
          <div className="select-all rounded-xl border border-emerald-900/30 bg-emerald-900/5 px-4 py-5 text-center font-mono text-xl tracking-widest text-emerald-900">
            {trackingCode}
          </div>
          <p className="text-xs text-ink-950/60">{t.reports.submit.success.checkLater}</p>
          <div className="flex gap-2">
            <button
              className="btn btn-ghost"
              onClick={() => {
                navigator.clipboard?.writeText(trackingCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? t.reports.submit.success.copied : t.reports.submit.success.copy}
            </button>
            <a className="btn btn-primary" href="/">{t.reports.submit.success.done}</a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6" dir={dir}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-emerald-900">{t.reports.submit.title}</h1>
        <LanguageToggle />
      </div>
      <p className="mb-4 text-sm text-ink-950/70">{t.reports.submit.subtitle}</p>

      <form className="card space-y-4" onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t.reports.submit.category}</label>
            <select className="field" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
              <option value="harassment">{t.reports.submit.categories.harassment}</option>
              <option value="safety">{t.reports.submit.categories.safety}</option>
              <option value="financial">{t.reports.submit.categories.financial}</option>
              <option value="other">{t.reports.submit.categories.other}</option>
            </select>
          </div>
          <div>
            <label className="label">{t.reports.submit.severity}</label>
            <select className="field" value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
              <option value="low">{t.reports.submit.severities.low}</option>
              <option value="medium">{t.reports.submit.severities.medium}</option>
              <option value="high">{t.reports.submit.severities.high}</option>
              <option value="critical">{t.reports.submit.severities.critical}</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">{t.reports.submit.subject}</label>
          <input className="field" required maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <label className="label">{t.reports.submit.body}</label>
          <textarea className="field min-h-[180px]" required maxLength={20000} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        {err && <p className="text-sm text-red-700">{err}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={!hrKey || stage === 'submitting'}>
          {stage === 'submitting' ? t.common.loading : t.reports.submit.submit}
        </button>
        <p className="text-center text-[11px] text-ink-950/50">
          No identity, IP, or device is stored. Encrypted on this device before send.
        </p>
      </form>
    </main>
  );
}

function concatIvAndCt(iv: Uint8Array, ct: Uint8Array): Uint8Array {
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return out;
}

// Turnstile token — placeholder. In production, render the Turnstile widget
// and read the token from window.turnstile.getResponse(). For dev, the
// test secret 1x… always passes regardless of the supplied token.
async function getTurnstileToken(): Promise<string> {
  // Allow the page to function without Turnstile in development.
  return 'dev-no-turnstile';
}
