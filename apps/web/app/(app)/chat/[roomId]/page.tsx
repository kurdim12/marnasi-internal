'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { auth, chat, type EncryptedMessage, type RoomDetail } from '@/lib/api-client';
import { loadIdentity, deserializeIdentity } from '@/lib/crypto/storage';
import { unwrapRoomKey } from '@/lib/crypto/keys';
import { decryptMessage, encryptMessage } from '@/lib/crypto/messages';

interface DecryptedMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: number;
  failed?: boolean;
}

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
  const { t, dir } = useI18n();
  const [me, setMe] = useState<{ id: string } | null>(null);
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const roomKeyRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await auth.me();
        if (cancelled) return;
        setMe({ id: user.id });

        const stored = await loadIdentity(user.id);
        if (!stored) throw new Error('no_identity_on_device');
        const identity = deserializeIdentity(stored);

        const { room: r } = await chat.room(roomId);
        if (cancelled) return;
        setRoom(r);

        const rk = await unwrapRoomKey(r.wrapped_room_key, identity.identity.privateKey);
        roomKeyRef.current = rk;

        const { messages: rows } = await chat.messages(roomId, { limit: 100 });
        const decrypted = await Promise.all(
          rows.reverse().map(async (m): Promise<DecryptedMessage> => {
            try {
              const text = await decryptMessage({
                roomKey: rk,
                roomId,
                senderId: m.senderId,
                timestampMs: m.createdAt,
                ciphertextB64: m.ciphertext,
                ivB64: m.iv,
              });
              return { id: m.id, senderId: m.senderId, text, createdAt: m.createdAt };
            } catch {
              return { id: m.id, senderId: m.senderId, text: t.chat.decryptError, createdAt: m.createdAt, failed: true };
            }
          }),
        );
        if (!cancelled) setMessages(decrypted);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'load_failed');
      }
    })();
    return () => { cancelled = true; };
  }, [roomId, t]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !roomKeyRef.current || !me || !room) return;
    const text = draft.trim();
    setDraft('');
    const now = Date.now();
    const enc = await encryptMessage({
      roomKey: roomKeyRef.current,
      roomId,
      senderId: me.id,
      timestampMs: now,
      plaintext: text,
    });
    // Optimistic
    const tempId = `temp-${now}`;
    setMessages((m) => [...m, { id: tempId, senderId: me.id, text, createdAt: now }]);
    try {
      const sent = await chat.send(roomId, {
        ciphertext: enc.ciphertext,
        iv: enc.iv,
        keyVersion: room.key_version,
        contentType: 'text',
      });
      setMessages((m) => m.map((x) => (x.id === tempId ? { ...x, id: sent.id, createdAt: sent.createdAt } : x)));
    } catch {
      setMessages((m) => m.map((x) => (x.id === tempId ? { ...x, failed: true } : x)));
    }
  }

  return (
    <section className="flex h-screen flex-col" dir={dir}>
      <header className="border-b border-ink-950/10 bg-white p-4">
        <p className="text-xs text-emerald-900">{t.chat.encrypted}</p>
        <p className="text-sm">{room ? `Room ${room.id.slice(0, 8)}` : t.common.loading}</p>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {err && <p className="text-sm text-red-700">{err}</p>}
        {messages.map((m) => (
          <div key={m.id} className={'flex ' + (m.senderId === me?.id ? 'justify-end' : 'justify-start')}>
            <div
              className={
                'max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ' +
                (m.failed ? 'bg-red-50 text-red-900' : m.senderId === me?.id ? 'bg-emerald-900 text-white' : 'bg-white')
              }
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="border-t border-ink-950/10 bg-white p-3">
        <div className="flex gap-2">
          <input
            className="field"
            placeholder={t.chat.placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">{t.chat.send}</button>
        </div>
      </form>
    </section>
  );
}
