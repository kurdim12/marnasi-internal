'use client';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { auth, type AuthUser } from '@/lib/api-client';

export default function SettingsPage() {
  const { t } = useI18n();
  const [me, setMe] = useState<AuthUser | null>(null);

  useEffect(() => { auth.me().then(setMe).catch(() => {}); }, []);

  if (!me) return <p className="p-6 text-sm">{t.common.loading}</p>;

  return (
    <section className="mx-auto max-w-md p-6">
      <h1 className="mb-6 text-2xl font-semibold">{t.nav.me}</h1>
      <div className="card space-y-3">
        <Row label="Email" value={me.email} />
        <Row label="Role" value={me.role} />
        <Row label="Department" value={me.department ?? '—'} />
        <Row label="Name (Arabic)" value={me.displayNameAr ?? '—'} />
        <Row label="Name (English)" value={me.displayNameEn ?? '—'} />
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-950/60">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
