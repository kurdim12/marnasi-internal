'use client';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { reports, type AdminReport } from '@/lib/api-client';
import { hybridDecryptFromPubkey } from '@/lib/crypto/keys';
import { fromBase64, fromUtf8 } from '@/lib/crypto/encoding';

interface DecryptedReport extends AdminReport {
  title?: string;
  body?: string;
  decryptError?: string;
}

/**
 * HR inbox.
 *
 * In this implementation HR's private key is provided once per session via a
 * password-protected paste — typed once into a session variable, never
 * persisted by the server. Production deployments should split the HR key
 * across M-of-N HR officers (Shamir).
 */
export default function ReportsInbox() {
  const { t } = useI18n();
  const [hrPriv, setHrPriv] = useState<Uint8Array | null>(null);
  const [hrPrivInput, setHrPrivInput] = useState('');
  const [items, setItems] = useState<DecryptedReport[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function loadAndDecrypt() {
    if (!hrPriv) return;
    try {
      const { reports: rows } = await reports.inbox();
      const decrypted = await Promise.all(rows.map(async (r) => decrypt(r, hrPriv)));
      setItems(decrypted);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  useEffect(() => { if (hrPriv) void loadAndDecrypt(); }, [hrPriv]);

  if (!hrPriv) {
    return (
      <section className="mx-auto max-w-md p-6">
        <h1 className="mb-4 text-xl font-semibold">{t.reports.inbox.title}</h1>
        <p className="mb-4 text-sm text-ink-950/70">
          Paste the HR private key (base64) to decrypt the inbox on this device.
          The key is held in memory only and discarded on reload.
        </p>
        <textarea
          className="field min-h-[120px] font-mono text-xs"
          placeholder="base64..."
          value={hrPrivInput}
          onChange={(e) => setHrPrivInput(e.target.value)}
        />
        <button
          className="btn btn-primary mt-3 w-full"
          onClick={() => {
            try { setHrPriv(fromBase64(hrPrivInput.trim())); }
            catch { setErr('invalid_base64'); }
          }}
        >
          Unlock
        </button>
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">{t.reports.inbox.title}</h1>
      {err && <p className="text-sm text-red-700">{err}</p>}
      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r.id} className="card">
            <div className="mb-2 flex items-center justify-between">
              <span className={'pill ' + severityClass(r.severity)}>{r.severity}</span>
              <span className="text-xs text-ink-950/60">{new Date(r.created_at).toLocaleString()}</span>
            </div>
            <h3 className="font-medium">{r.title ?? (r.decryptError ? '—' : t.common.loading)}</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink-950/80">{r.body ?? r.decryptError}</p>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <select
                className="rounded-lg border border-ink-950/10 px-2 py-1"
                defaultValue={r.status}
                onChange={async (e) => {
                  await reports.updateStatus(r.id, { status: e.target.value });
                }}
              >
                {['open', 'triaged', 'investigating', 'resolved', 'closed'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span className="text-ink-950/60">{r.category}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function decrypt(r: AdminReport, hrPriv: Uint8Array): Promise<DecryptedReport> {
  try {
    // 1. Recover AES key
    const wrappedAll = fromBase64(r.wrapped_aes_key);
    const iv = wrappedAll.slice(0, 12);
    const ct = wrappedAll.slice(12);
    const aesRaw = await hybridDecryptFromPubkey({
      ephemeralPubkey: fromBase64(r.ephemeral_pubkey),
      iv,
      ciphertext: ct,
      recipientPrivkey: hrPriv,
    });
    const aesKey = await crypto.subtle.importKey('raw', aesRaw, { name: 'AES-GCM' }, false, ['decrypt']);

    // 2. Decrypt each field (iv||ct concatenated)
    async function decField(b64: string): Promise<string> {
      const bytes = fromBase64(b64);
      const fIv = bytes.slice(0, 12);
      const fCt = bytes.slice(12);
      const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fIv }, aesKey, fCt));
      return fromUtf8(pt);
    }

    return {
      ...r,
      title: await decField(r.title_encrypted),
      body: await decField(r.body_encrypted),
    };
  } catch (e) {
    return { ...r, decryptError: (e as Error).message };
  }
}

function severityClass(s: string): string {
  return {
    critical: 'bg-red-100 text-red-900',
    high: 'bg-orange-100 text-orange-900',
    medium: 'bg-amber-100 text-amber-900',
    low: 'bg-emerald-100 text-emerald-900',
  }[s] ?? 'bg-ink-950/10';
}
