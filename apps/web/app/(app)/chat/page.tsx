'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { chat, type RoomSummary } from '@/lib/api-client';

export default function ChatIndex() {
  const { t } = useI18n();
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    chat.myRooms().then(({ rooms }) => setRooms(rooms)).catch(() => setErr(t.common.error));
  }, [t]);

  return (
    <section className="mx-auto max-w-2xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t.chat.title}</h1>
        <button className="btn btn-primary">{t.chat.newConversation}</button>
      </header>
      {err && <p className="text-sm text-red-700">{err}</p>}
      {rooms === null ? (
        <p className="text-sm text-ink-950/60">{t.common.loading}</p>
      ) : rooms.length === 0 ? (
        <p className="text-sm text-ink-950/60">{t.chat.noRooms}</p>
      ) : (
        <ul className="space-y-2">
          {rooms.map((r) => (
            <li key={r.id} className="card hover:shadow-md">
              <Link href={`/chat/${r.id}`} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{r.type === 'dm' ? 'Direct Message' : 'Group'}</p>
                  <p className="text-xs text-ink-950/60">
                    {r.message_count} messages · key v{r.key_version}
                  </p>
                </div>
                <span className="pill bg-emerald-900/10 text-emerald-900">{t.chat.encrypted}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
