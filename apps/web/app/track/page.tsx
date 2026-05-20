'use client';
import { useState, type FormEvent } from 'react';
import { useI18n } from '@/lib/i18n';
import { reports, type TrackedReport } from '@/lib/api-client';
import { LanguageToggle } from '@/components/LanguageToggle';

export default function TrackPage() {
  const { t, dir } = useI18n();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<TrackedReport | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setResult(null);
    try {
      const r = await reports.track({ code, turnstileToken: 'dev-no-turnstile' });
      setResult(r);
    } catch {
      setErr('not_found');
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6" dir={dir}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-emerald-900">{t.reports.track.title}</h1>
        <LanguageToggle />
      </div>
      <form className="card space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="label">{t.reports.track.code}</label>
          <input
            className="field font-mono"
            placeholder="K7H2-MQ9X-LP3R"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </div>
        <button className="btn btn-primary w-full" type="submit">{t.reports.track.submit}</button>
        {err && <p className="text-sm text-red-700">{err}</p>}
      </form>

      {result && (
        <div className="card mt-4">
          <p className="text-xs uppercase tracking-wide text-ink-950/60">{t.reports.track.status}</p>
          <p className="text-lg font-medium text-emerald-900">{result.status}</p>
          <p className="mt-3 text-xs text-ink-950/60">{t.reports.track.lastUpdate}</p>
          <p className="text-sm">{new Date(result.updatedAt).toLocaleString()}</p>
          {result.statusNoteEncrypted ? (
            <p className="mt-3 text-sm italic text-ink-950/60">[encrypted response — fetch via account if available]</p>
          ) : (
            <p className="mt-3 text-sm text-ink-950/60">{t.reports.track.noResponse}</p>
          )}
        </div>
      )}
    </main>
  );
}
