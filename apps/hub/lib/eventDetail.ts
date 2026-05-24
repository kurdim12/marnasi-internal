/*
  Deterministic derivation of per-event production data (tasks, vendor
  assignments, budget) from the seed. No randomness — same inputs always yield
  the same output, so server render is stable. This stands in for the
  event_tasks / event_vendors / budget tables until a real backend exists.
*/

import { vendors } from './seed';
import { eventDateFromOffset } from './utils';
import type { ActiveEvent, EventType, Vendor, VendorCategory } from './types';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';
export type TaskCategory = 'proposal' | 'contract' | 'vendor' | 'design' | 'logistics' | 'day_of' | 'post_event';
export type EventVendorStatus = 'proposed' | 'contacted' | 'confirmed' | 'paid' | 'completed';

export interface DerivedTask {
  en: string;
  ar: string;
  category: TaskCategory;
  status: TaskStatus;
  dueIso: string;
}

export interface DerivedVendor {
  vendor: Vendor;
  status: EventVendorStatus;
  agreedCostJod: number;
  paidJod: number;
}

const TASK_TEMPLATE: { en: string; ar: string; category: TaskCategory; offsetDays: number }[] = [
  { en: 'Proposal sent', ar: 'إرسال العرض', category: 'proposal', offsetDays: 150 },
  { en: 'Contract signed', ar: 'توقيع العقد', category: 'contract', offsetDays: 140 },
  { en: 'Mood board approved', ar: 'اعتماد لوحة الإلهام', category: 'design', offsetDays: 130 },
  { en: 'Venue confirmed', ar: 'تأكيد القاعة', category: 'vendor', offsetDays: 120 },
  { en: 'Catering tasting', ar: 'تذوّق الضيافة', category: 'vendor', offsetDays: 100 },
  { en: 'Floral design approved', ar: 'اعتماد تصميم الزهور', category: 'design', offsetDays: 90 },
  { en: 'Photography booked', ar: 'حجز التصوير', category: 'vendor', offsetDays: 80 },
  { en: 'Videography booked', ar: 'حجز التصوير السينمائي', category: 'vendor', offsetDays: 75 },
  { en: 'Lighting plan set', ar: 'اعتماد خطة الإضاءة', category: 'vendor', offsetDays: 60 },
  { en: 'Sound & AV plan', ar: 'خطة الصوت والعرض', category: 'vendor', offsetDays: 50 },
  { en: 'Entertainment confirmed', ar: 'تأكيد الترفيه', category: 'vendor', offsetDays: 45 },
  { en: 'Guest list finalized', ar: 'إغلاق قائمة الضيوف', category: 'logistics', offsetDays: 35 },
  { en: 'Seating plan', ar: 'مخطط الجلوس', category: 'logistics', offsetDays: 25 },
  { en: 'Décor build approved', ar: 'اعتماد تنفيذ الديكور', category: 'design', offsetDays: 18 },
  { en: 'Transport arranged', ar: 'ترتيب النقل', category: 'logistics', offsetDays: 12 },
  { en: 'Final walkthrough', ar: 'الجولة النهائية', category: 'day_of', offsetDays: 5 },
  { en: 'Rehearsal', ar: 'البروفة', category: 'day_of', offsetDays: 2 },
  { en: 'Event day', ar: 'يوم الفعالية', category: 'day_of', offsetDays: 0 },
  { en: 'Highlight film delivered', ar: 'تسليم الفيلم', category: 'post_event', offsetDays: -7 },
];

const NEEDS: Record<EventType, VendorCategory[]> = {
  wedding: ['venue', 'catering', 'floral', 'photography', 'videography', 'lighting', 'sound', 'decor', 'entertainment'],
  private: ['venue', 'catering', 'floral', 'photography', 'lighting', 'entertainment'],
  corporate: ['venue', 'catering', 'sound', 'lighting', 'photography'],
  conference: ['venue', 'catering', 'sound', 'lighting', 'photography', 'videography'],
  gala: ['venue', 'catering', 'floral', 'photography', 'videography', 'lighting', 'sound', 'entertainment'],
  other: ['venue', 'catering', 'photography'],
};

function pct(ev: ActiveEvent): number {
  return ev.tasksComplete / ev.tasksTotal;
}

export function deriveTasks(ev: ActiveEvent): DerivedTask[] {
  const eventDate = eventDateFromOffset(ev.daysFromNow);
  const shown = Math.min(ev.tasksTotal, TASK_TEMPLATE.length);
  const completeCount = ev.status === 'completed' ? shown : Math.round(shown * pct(ev));
  return TASK_TEMPLATE.slice(0, shown).map((t, i) => {
    const due = new Date(eventDate);
    due.setDate(due.getDate() - t.offsetDays);
    const status: TaskStatus = i < completeCount ? 'completed' : i === completeCount ? 'in_progress' : 'pending';
    return { en: t.en, ar: t.ar, category: t.category, status, dueIso: due.toISOString() };
  });
}

function pickVendor(category: VendorCategory): Vendor | undefined {
  return vendors
    .filter((v) => v.category === category)
    .sort((a, b) => Number(b.isPreferred) - Number(a.isPreferred) || b.rating - a.rating)[0];
}

export function deriveVendors(ev: ActiveEvent): DerivedVendor[] {
  const needs = NEEDS[ev.eventType] ?? NEEDS.other;
  const p = pct(ev);
  const picks = needs.map((c) => pickVendor(c)).filter((v): v is Vendor => Boolean(v));
  const n = picks.length;
  return picks.map((vendor, i) => {
    const f = n <= 1 ? 0 : i / n;
    let status: EventVendorStatus;
    if (ev.status === 'completed') status = 'completed';
    else if (f < p * 0.6) status = 'paid';
    else if (f < p) status = 'confirmed';
    else if (f < p + 0.25) status = 'contacted';
    else status = 'proposed';
    const agreedCostJod = vendor.averageCostJod ?? 5000;
    const paidJod =
      status === 'completed' || status === 'paid' ? agreedCostJod
      : status === 'confirmed' ? Math.round(agreedCostJod * 0.5)
      : 0;
    return { vendor, status, agreedCostJod, paidJod };
  });
}

export interface DerivedBudget {
  lines: DerivedVendor[];
  totalPlanned: number;
  invoiced: number;
  paidToDate: number;
  outstanding: number;
}

export function deriveBudget(ev: ActiveEvent): DerivedBudget {
  const lines = deriveVendors(ev);
  const totalPlanned = lines.reduce((s, l) => s + l.agreedCostJod, 0);
  const paidToDate = lines.reduce((s, l) => s + l.paidJod, 0);
  const invoiced = ev.totalBudgetJod;
  return { lines, totalPlanned, invoiced, paidToDate, outstanding: Math.max(0, invoiced - paidToDate) };
}
