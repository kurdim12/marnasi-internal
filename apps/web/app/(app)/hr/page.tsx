'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useI18n } from '@/lib/i18n';
import { api } from '@/lib/api-client';

interface LeaveRequest {
  id: string;
  type: 'annual' | 'sick' | 'unpaid' | 'maternity';
  start_date: string;
  end_date: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: number;
}

export default function HrPage() {
  const { t } = useI18n();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [type, setType] = useState<'annual' | 'sick' | 'unpaid' | 'maternity'>('annual');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');

  async function load() {
    const r = await api<{ requests: LeaveRequest[] }>('/hr/leave');
    setRequests(r.requests);
  }
  useEffect(() => { void load(); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    await api('/hr/leave', { method: 'POST', json: { type, startDate: start, endDate: end, reason } });
    setReason('');
    void load();
  }

  return (
    <section className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">{t.hr.leave.title}</h1>
      <form className="card mb-6 grid grid-cols-2 gap-3" onSubmit={submit}>
        <div>
          <label className="label">{t.hr.leave.type}</label>
          <select className="field" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="annual">{t.hr.leave.types.annual}</option>
            <option value="sick">{t.hr.leave.types.sick}</option>
            <option value="unpaid">{t.hr.leave.types.unpaid}</option>
            <option value="maternity">{t.hr.leave.types.maternity}</option>
          </select>
        </div>
        <div />
        <div>
          <label className="label">{t.hr.leave.from}</label>
          <input type="date" className="field" required value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="label">{t.hr.leave.to}</label>
          <input type="date" className="field" required value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="label">{t.hr.leave.reason}</label>
          <textarea className="field min-h-[80px]" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary col-span-2">{t.hr.leave.submit}</button>
      </form>

      <ul className="space-y-2">
        {requests.map((r) => (
          <li key={r.id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium">{t.hr.leave.types[r.type]}</p>
              <p className="text-xs text-ink-950/60">{r.start_date} → {r.end_date}</p>
            </div>
            <span className="pill bg-ivory-100">{t.hr.leave.status[r.status]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
