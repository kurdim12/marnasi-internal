/*
  Data-access layer. Reads from Cloudflare D1 when a `DB` binding is present
  (production, once the Pages project is bound), and falls back to the in-repo
  seed fixtures otherwise (local `next dev`, and any deploy without the binding
  yet). The two paths return identical shapes, so the UI never changes.

  This is the seam the brief's backend slots into: swap fixtures for D1 with no
  component edits.
*/

import {
  staff as seedStaff, clients as seedClients, leads as seedLeads,
  vendors as seedVendors, activeEvents as seedActive, pastEvents as seedPast,
  eventForToken as seedEventForToken, findActiveEvent as seedFindActive,
  findPastEvent as seedFindPast,
} from './seed';
import type { ActiveEvent, Lead, PastEvent } from './types';

interface D1Result<T> { results: T[] }
interface D1Statement { bind(...vals: unknown[]): D1Statement; all<T = Row>(): Promise<D1Result<T>>; first<T = Row>(): Promise<T | null> }
interface D1Database { prepare(query: string): D1Statement }
type Row = Record<string, unknown>;

async function getD1(): Promise<D1Database | null> {
  try {
    const mod = await import('@cloudflare/next-on-pages');
    const env = mod.getRequestContext().env as { DB?: D1Database };
    return env?.DB ?? null;
  } catch {
    return null; // no Cloudflare request context (dev) or no binding
  }
}

const n = (v: unknown): number => Number(v ?? 0);
const s = (v: unknown): string => (v == null ? '' : String(v));
const opt = (v: unknown): string | undefined => (v == null ? undefined : String(v));

function rowToActive(r: Row): ActiveEvent {
  return {
    id: s(r.id),
    leadId: opt(r.lead_id),
    clientId: opt(r.client_id),
    name: s(r.name),
    eventType: s(r.event_type) as ActiveEvent['eventType'],
    daysFromNow: Math.round((n(r.event_date) - Date.now()) / 86400000),
    venue: s(r.venue),
    venueAddress: opt(r.venue_address),
    guestCount: n(r.guest_count),
    tier: s(r.tier) as ActiveEvent['tier'],
    status: s(r.status) as ActiveEvent['status'],
    totalBudgetJod: n(r.total_budget_jod),
    producerName: s(r.producer_name),
    tasksTotal: n(r.tasks_total) || 1,
    tasksComplete: n(r.tasks_complete),
    gradient: [s(r.gradient_from) || '#0B3D2E', s(r.gradient_to) || '#14543f'],
  };
}

function rowToPast(r: Row): PastEvent {
  return {
    id: s(r.id),
    name: s(r.name),
    eventType: s(r.event_type) as PastEvent['eventType'],
    date: new Date(n(r.event_date)).toISOString().slice(0, 10),
    venue: s(r.venue),
    guestCount: n(r.guest_count),
    tier: s(r.tier) as PastEvent['tier'],
    budgetJod: n(r.total_budget_jod),
    gradient: [s(r.gradient_from) || '#0B3D2E', s(r.gradient_to) || '#14543f'],
  };
}

function rowToLead(r: Row): Lead {
  return {
    id: s(r.id),
    clientId: opt(r.client_id),
    clientName: s(r.client_name),
    eventType: s(r.event_type) as Lead['eventType'],
    estimatedGuestCount: r.estimated_guest_count == null ? undefined : n(r.estimated_guest_count),
    preferredVenue: opt(r.preferred_venue),
    preferredDate: opt(r.preferred_date),
    tier: opt(r.tier) as Lead['tier'],
    source: s(r.source) as Lead['source'],
    rawMessage: s(r.raw_message),
    status: s(r.status) as Lead['status'],
    receivedHoursAgo: Math.max(0, Math.round((Date.now() - n(r.received_at)) / 3600000)),
    noteKey: opt(r.note_key) as Lead['noteKey'],
    assignedTo: opt(r.assigned_to),
  };
}

const ACTIVE_COLS =
  'e.*, p.full_name AS producer_name FROM events e LEFT JOIN profiles p ON p.user_id = e.producer_id';

export async function getLeads(): Promise<Lead[]> {
  const db = await getD1();
  if (!db) return seedLeads;
  const { results } = await db.prepare('SELECT * FROM leads ORDER BY received_at DESC').all();
  return results.map(rowToLead);
}

export async function getActiveEvents(): Promise<ActiveEvent[]> {
  const db = await getD1();
  if (!db) return seedActive;
  const { results } = await db.prepare(`SELECT ${ACTIVE_COLS} WHERE e.is_library = 0 ORDER BY e.event_date ASC`).all();
  return results.map(rowToActive);
}

export async function getPastEvents(): Promise<PastEvent[]> {
  const db = await getD1();
  if (!db) return seedPast;
  const { results } = await db.prepare('SELECT * FROM events WHERE is_library = 1 ORDER BY event_date DESC').all();
  return results.map(rowToPast);
}

export async function getActiveEvent(id: string): Promise<ActiveEvent | null> {
  const db = await getD1();
  if (!db) return seedFindActive(id) ?? null;
  const row = await db.prepare(`SELECT ${ACTIVE_COLS} WHERE e.id = ? AND e.is_library = 0`).bind(id).first();
  return row ? rowToActive(row) : null;
}

export async function getPastEvent(id: string): Promise<PastEvent | null> {
  const db = await getD1();
  if (!db) return seedFindPast(id) ?? null;
  const row = await db.prepare('SELECT * FROM events WHERE id = ? AND is_library = 1').bind(id).first();
  return row ? rowToPast(row) : null;
}

export interface PortalData {
  event: ActiveEvent;
  producerName: string;
  producerPhone?: string;
  producerColor: string;
  clientName: string;
}

export async function getPortal(token: string): Promise<PortalData | null> {
  const db = await getD1();
  if (!db) {
    const event = seedEventForToken(token);
    if (!event) return null;
    const producer = seedStaff.find((p) => p.fullName === event.producerName);
    const client = event.clientId ? seedClients.find((c) => c.id === event.clientId) : undefined;
    return {
      event,
      producerName: event.producerName,
      producerPhone: producer?.phone,
      producerColor: producer?.avatarColor ?? '#0B3D2E',
      clientName: client?.fullName ?? '',
    };
  }
  const row = await db
    .prepare(`SELECT ${ACTIVE_COLS}, p.phone AS producer_phone, p.avatar_color AS producer_color, c.full_name AS client_full_name
              FROM events e
              JOIN client_sessions cs ON cs.event_id = e.id
              LEFT JOIN profiles p ON p.user_id = e.producer_id
              LEFT JOIN clients c ON c.id = e.client_id
              WHERE cs.token = ?`)
    .bind(token)
    .first<Row>();
  if (!row) return null;
  return {
    event: rowToActive(row),
    producerName: s(row.producer_name),
    producerPhone: opt(row.producer_phone),
    producerColor: s(row.producer_color) || '#0B3D2E',
    clientName: s(row.client_full_name),
  };
}
