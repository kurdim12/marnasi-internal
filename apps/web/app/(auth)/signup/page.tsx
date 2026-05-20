'use client';

import { useState, type FormEvent, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { auth, ApiError } from '@/lib/api-client';
import { generateIdentity, toPublicBundle } from '@/lib/crypto/keys';
import { encryptKeyBundle } from '@/lib/crypto/kek';
import { serializeIdentity, storeIdentity } from '@/lib/crypto/storage';
import { utf8 } from '@/lib/crypto/encoding';
import { LanguageToggle } from '@/components/LanguageToggle';

function SignupInner() {
  const { t, dir } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [displayNameAr, setNameAr] = useState('');
  const [displayNameEn, setNameEn] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [stage, setStage] = useState<'form' | 'keygen' | 'submitting' | 'done'>('form');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return setErr('Missing invite token.');
    if (password.length < 12) return setErr('Password must be at least 12 characters.');
    setErr(null);
    setBusy(true);
    try {
      setStage('keygen');
      // 1. Generate identity bundle in browser. Private keys never leave the device unencrypted.
      const identity = generateIdentity(100);
      const pub = toPublicBundle(identity);
      const stored = serializeIdentity(identity);

      // 2. Encrypt the private-key bundle with the password-derived KEK,
      //    so the server can store an opaque blob enabling cross-device login.
      const bundleBlob = utf8(JSON.stringify(stored));
      const encryptedKeyBundle = await encryptKeyBundle(bundleBlob, password);

      setStage('submitting');
      // 3. Complete signup
      await auth.signupComplete({
        inviteToken: token,
        password,
        displayNameAr,
        displayNameEn,
        phone: phone || undefined,
        identityPubkey: pub.identityPubkey,
        signedPrekey: pub.signedPrekey,
        signedPrekeySig: pub.signedPrekeySig,
        oneTimePrekeys: pub.oneTimePrekeys,
        encryptedKeyBundle,
      });

      // 4. Log in immediately to get session cookies
      const { user } = await auth.login({ email: '', password }) as { user: { id: string } };
      void user;
      await storeIdentity('current', stored);
      setStage('done');
      router.push('/chat');
    } catch (e) {
      if (e instanceof ApiError) setErr(e.code);
      else setErr('Something went wrong.');
      setStage('form');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6" dir={dir}>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl text-emerald-900">{t.app.name}</h1>
        <LanguageToggle />
      </div>

      <form className="card space-y-4" onSubmit={onSubmit}>
        <div>
          <h2 className="text-lg font-semibold">{t.auth.signup.title}</h2>
          <p className="mt-1 text-sm text-ink-950/60">{t.auth.signup.subtitle}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t.auth.signup.displayNameAr}</label>
            <input className="field" required value={displayNameAr} onChange={(e) => setNameAr(e.target.value)} />
          </div>
          <div>
            <label className="label">{t.auth.signup.displayNameEn}</label>
            <input className="field" required value={displayNameEn} onChange={(e) => setNameEn(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">{t.auth.signup.phone}</label>
          <input className="field" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="label">{t.auth.signup.password}</label>
          <input className="field" type="password" required minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="mt-1 text-xs text-ink-950/60">{t.auth.signup.passwordHint}</p>
        </div>

        <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900">
          {t.auth.signup.warning}
        </div>

        {err && <p className="text-sm text-red-700">{err}</p>}

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {stage === 'keygen' ? 'Generating keys…' : stage === 'submitting' ? 'Setting up…' : t.auth.signup.submit}
        </button>
      </form>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}
