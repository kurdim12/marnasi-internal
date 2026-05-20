'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { auth, ApiError } from '@/lib/api-client';
import { decryptKeyBundle } from '@/lib/crypto/kek';
import { deserializeIdentity, storeIdentity, type StoredIdentity } from '@/lib/crypto/storage';
import { fromUtf8 } from '@/lib/crypto/encoding';
import { LanguageToggle } from '@/components/LanguageToggle';

export default function LoginPage() {
  const { t, dir } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      const { user } = await auth.login({ email, password });
      // Fetch + decrypt encrypted key bundle on this device (cross-device login)
      try {
        const bundle = await auth.keyBundle();
        const plaintext = await decryptKeyBundle(bundle, password);
        const stored = JSON.parse(fromUtf8(plaintext)) as StoredIdentity;
        await storeIdentity(user.id, stored);
      } catch {
        // First login on this device with no bundle is fine for HR-only users etc.
        // Chat will refuse to decrypt until keys are present.
      }
      router.push('/chat');
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) setErr(t.auth.login.errors.rateLimited);
      else setErr(t.auth.login.errors.invalid);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6" dir={dir}>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl text-emerald-900">{t.app.name}</h1>
        <LanguageToggle />
      </div>

      <form className="card space-y-4" onSubmit={onSubmit}>
        <h2 className="text-lg font-semibold">{t.auth.login.title}</h2>
        <div>
          <label className="label">{t.auth.login.email}</label>
          <input className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">{t.auth.login.password}</label>
          <input className="field" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {err && <p className="text-sm text-red-700">{err}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
          {submitting ? t.common.loading : t.auth.login.submit}
        </button>
        <div className="flex items-center justify-between pt-2 text-sm">
          <Link href="/forgot-password" className="text-emerald-900 hover:underline">{t.auth.login.forgotPassword}</Link>
          <Link href="/report" className="text-ink-950/60 hover:underline">/report</Link>
        </div>
      </form>
    </main>
  );
}
