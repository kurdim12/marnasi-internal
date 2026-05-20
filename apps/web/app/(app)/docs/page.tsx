'use client';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { api } from '@/lib/api-client';

interface DocRow {
  id: string;
  title: string;
  description: string | null;
  visibility: 'private' | 'department' | 'company';
  department: string | null;
  size_bytes: number;
  mime_type: string;
  created_at: number;
}

export default function DocsPage() {
  const { t } = useI18n();
  const [docs, setDocs] = useState<DocRow[]>([]);

  useEffect(() => {
    api<{ documents: DocRow[] }>('/docs').then((r) => setDocs(r.documents)).catch(() => {});
  }, []);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', file.name);
    fd.append('visibility', 'private');
    await api('/docs', { method: 'POST', body: fd });
    const r = await api<{ documents: DocRow[] }>('/docs');
    setDocs(r.documents);
  }

  return (
    <section className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t.docs.title}</h1>
        <label className="btn btn-primary cursor-pointer">
          {t.docs.upload}
          <input type="file" className="hidden" onChange={onUpload} />
        </label>
      </header>
      <ul className="space-y-2">
        {docs.map((d) => (
          <li key={d.id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium">{d.title}</p>
              <p className="text-xs text-ink-950/60">{t.docs.visibility[d.visibility]} · {(d.size_bytes / 1024).toFixed(1)} KB</p>
            </div>
            <a
              className="btn btn-ghost"
              href={`${process.env.NEXT_PUBLIC_API_BASE_URL}/docs/${d.id}/download`}
            >
              {t.docs.download}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
