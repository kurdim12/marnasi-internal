/*
  Seed fixtures. Per the brief, "the seed data is half the product" — without
  it the demo is dead and the dashboard would show empty states (forbidden).
  Everything here is realistic Maranasi Events data for Amman / the Levant.

  These arrays satisfy the same shapes as the canonical schema (Section 4), so
  a real backend can replace them later with no UI changes.
*/

import type {
  ActiveEvent, Client, Gradient, Lead, PastEvent, Profile, Vendor,
} from '../types';

// Art-direction gradients used when a card has no attached photograph.
const G = {
  emerald: ['#0B3D2E', '#14543f'] as Gradient,
  deadSea: ['#0B3D2E', '#1f6b63'] as Gradient,
  night: ['#07291f', '#0B3D2E'] as Gradient,
  warm: ['#14543f', '#9c7f3f'] as Gradient,
  stone: ['#1A2E2A', '#3a4a40'] as Gradient,
  plum: ['#221d2e', '#0B3D2E'] as Gradient,
};

export const TASKS_THIS_WEEK = 3;

/* Staff (Section 7.1) -------------------------------------------------- */
export const staff: Profile[] = [
  { userId: 'staff-hadeel', email: 'hadeel@maranasi.com', fullName: 'Hadeel Al-Masri', role: 'owner', avatarColor: '#0B3D2E', phone: '+962 7 9000 0001', languagePreference: 'ar' },
  { userId: 'staff-tareq', email: 'tareq@maranasi.com', fullName: 'Tareq Nashawati', role: 'producer', avatarColor: '#14543f', phone: '+962 7 9000 0002', languagePreference: 'en' },
  { userId: 'staff-lina', email: 'lina@maranasi.com', fullName: 'Lina Khoury', role: 'coordinator', avatarColor: '#1f6b63', phone: '+962 7 9000 0003', languagePreference: 'ar' },
  { userId: 'staff-rana', email: 'rana@maranasi.com', fullName: 'Rana Saleh', role: 'assistant', avatarColor: '#3a4a40', phone: '+962 7 9000 0004', languagePreference: 'en' },
];

export function findStaffByEmail(email: string): Profile | undefined {
  return staff.find((s) => s.email.toLowerCase() === email.toLowerCase());
}
export function findStaffById(id: string): Profile | undefined {
  return staff.find((s) => s.userId === id);
}

/* Clients (Section 7.2) ------------------------------------------------ */
export const clients: Client[] = [
  { id: 'client-reem', fullName: 'Reem Al-Khoury', email: 'reem.alkhoury@gmail.com', phone: '+962 7 9123 4567', languagePreference: 'ar', isCorporate: false },
  { id: 'client-tabbaa', fullName: 'Dana Tabbaa', email: 'dana.tabbaa@gmail.com', languagePreference: 'ar', isCorporate: false },
  { id: 'client-daoudi', fullName: 'Yousef Daoudi', email: 'yousef.daoudi@outlook.com', languagePreference: 'en', isCorporate: false },
  { id: 'client-husseini', fullName: 'Layla Husseini', email: 'layla.husseini@gmail.com', languagePreference: 'ar', isCorporate: false },
  { id: 'client-bisharat', fullName: 'Maha Bisharat', email: 'maha.bisharat@gmail.com', languagePreference: 'ar', isCorporate: false },
  { id: 'client-shomali', fullName: 'Khalid Shomali', email: 'k.shomali@shomaligroup.jo', languagePreference: 'en', isCorporate: false },
  { id: 'client-aramex', fullName: 'Aramex', email: 'events@aramex.com', notes: 'Contact: Nadia Haddad, Brand & Events', languagePreference: 'en', isCorporate: true },
  { id: 'client-rj', fullName: 'Royal Jordanian', email: 'corporate@rj.com', notes: 'Contact: Omar Qasem, Corporate Affairs', languagePreference: 'en', isCorporate: true },
  { id: 'client-capitalbank', fullName: 'Capital Bank', email: 'comms@capitalbank.jo', notes: 'Contact: Rania Faouri, Communications', languagePreference: 'en', isCorporate: true },
  { id: 'client-cpf', fullName: 'Crown Prince Foundation', email: 'events@cpf.jo', notes: 'Contact: Yara Tell, Programs', languagePreference: 'ar', isCorporate: true },
  { id: 'client-mansour', fullName: 'Ali Mansour', email: 'ali.mansour@gmail.com', languagePreference: 'ar', isCorporate: false },
  { id: 'client-tarawneh', fullName: 'Daoud Tarawneh', email: 'd.tarawneh@tarawnehco.jo', languagePreference: 'en', isCorporate: false },
];

/* Vendors (Section 7.3) ------------------------------------------------ */
export const vendors: Vendor[] = [
  // Catering
  { id: 'v-talet', name: 'Talet Al-Jabal', category: 'catering', contactName: 'Samir Haddad', phone: '+962 6 462 1100', whatsappNumber: '+962 7 9555 1100', rating: 4.8, timesUsed: 31, lastUsedDate: '2026-02-08', averageCostJod: 14500, isPreferred: true },
  { id: 'v-sufra', name: 'Sufra by Tawaheen', category: 'catering', contactName: 'Lubna Tawaheen', rating: 4.6, timesUsed: 22, lastUsedDate: '2025-12-11', averageCostJod: 11200, isPreferred: true },
  { id: 'v-levant', name: 'Levant Caterers', category: 'catering', rating: 4.2, timesUsed: 14, lastUsedDate: '2025-11-20', averageCostJod: 9800, isPreferred: false },
  { id: 'v-beitsitti', name: 'Beit Sitti Events', category: 'catering', rating: 4.4, timesUsed: 9, lastUsedDate: '2025-10-04', averageCostJod: 8600, isPreferred: false },
  // Floral
  { id: 'v-rosesco', name: 'Roses & Co.', category: 'floral', contactName: 'Carine Najjar', rating: 4.9, timesUsed: 27, lastUsedDate: '2026-02-08', averageCostJod: 6200, isPreferred: true },
  { id: 'v-bloom', name: 'Bloom Amman', category: 'floral', rating: 4.3, timesUsed: 16, lastUsedDate: '2025-12-11', averageCostJod: 4800, isPreferred: false },
  { id: 'v-thestem', name: 'The Stem', category: 'floral', rating: 4.5, timesUsed: 11, lastUsedDate: '2026-01-22', averageCostJod: 5100, isPreferred: false },
  // Photography
  { id: 'v-studiovert', name: 'Studio Vert', category: 'photography', contactName: 'Khaled Rifai', rating: 4.9, timesUsed: 24, lastUsedDate: '2026-02-08', averageCostJod: 3800, isPreferred: true },
  { id: 'v-mkphoto', name: 'Mohammad Al-Khateeb Photography', category: 'photography', rating: 4.7, timesUsed: 19, lastUsedDate: '2025-12-11', averageCostJod: 3200, isPreferred: true },
  { id: 'v-lenslight', name: 'Lens & Light', category: 'photography', rating: 4.1, timesUsed: 8, lastUsedDate: '2025-10-04', averageCostJod: 2600, isPreferred: false },
  // Videography
  { id: 'v-cinematicjo', name: 'Cinematic Jordan', category: 'videography', rating: 4.8, timesUsed: 18, lastUsedDate: '2026-01-22', averageCostJod: 5400, isPreferred: true },
  { id: 'v-storyfilms', name: 'Story Films', category: 'videography', rating: 4.4, timesUsed: 12, lastUsedDate: '2025-11-20', averageCostJod: 4700, isPreferred: false },
  // Lighting
  { id: 'v-glow', name: 'Glow Jordan', category: 'lighting', rating: 4.6, timesUsed: 21, lastUsedDate: '2026-02-08', averageCostJod: 4300, isPreferred: true },
  { id: 'v-lumiere', name: 'Lumière Events', category: 'lighting', rating: 4.2, timesUsed: 10, lastUsedDate: '2025-12-11', averageCostJod: 3900, isPreferred: false },
  // Sound
  { id: 'v-echo', name: 'Echo Productions', category: 'sound', rating: 4.5, timesUsed: 17, lastUsedDate: '2026-01-22', averageCostJod: 3600, isPreferred: true },
  { id: 'v-soundwave', name: 'SoundWave Amman', category: 'sound', rating: 3.9, timesUsed: 7, lastUsedDate: '2025-09-27', averageCostJod: 3100, isPreferred: false },
  // Venues
  { id: 'v-kempinski-deadsea', name: 'Kempinski Ishtar Dead Sea', category: 'venue', rating: 4.9, timesUsed: 12, lastUsedDate: '2025-06-14', averageCostJod: 22000, isPreferred: true },
  { id: 'v-movenpick', name: 'Mövenpick Resort', category: 'venue', rating: 4.5, timesUsed: 15, lastUsedDate: '2026-01-22', averageCostJod: 14000, isPreferred: true },
  { id: 'v-stregis', name: 'St. Regis Amman', category: 'venue', rating: 4.8, timesUsed: 9, lastUsedDate: '2026-02-08', averageCostJod: 19000, isPreferred: true },
  { id: 'v-fourseasons', name: 'Four Seasons Amman', category: 'venue', rating: 4.8, timesUsed: 11, lastUsedDate: '2025-11-20', averageCostJod: 18500, isPreferred: true },
  { id: 'v-rcc', name: 'The Royal Cultural Center', category: 'venue', rating: 4.0, timesUsed: 6, lastUsedDate: '2025-09-27', averageCostJod: 7000, isPreferred: false },
  { id: 'v-jordanmuseum', name: 'Jordan Museum', category: 'venue', rating: 4.3, timesUsed: 5, lastUsedDate: '2025-12-11', averageCostJod: 9000, isPreferred: false },
  // Decor
  { id: 'v-maison', name: 'Maison Atelier', category: 'decor', contactName: 'Nour Khalil', rating: 4.7, timesUsed: 20, lastUsedDate: '2026-02-08', averageCostJod: 12000, isPreferred: true },
  { id: 'v-dare', name: 'Daré Designs', category: 'decor', rating: 4.4, timesUsed: 13, lastUsedDate: '2025-10-04', averageCostJod: 9500, isPreferred: false },
  // Entertainment
  { id: 'v-trio', name: 'The Trio Amman', category: 'entertainment', rating: 4.6, timesUsed: 14, lastUsedDate: '2025-12-11', averageCostJod: 2800, isPreferred: true },
  { id: 'v-djkarim', name: 'DJ Karim', category: 'entertainment', rating: 4.5, timesUsed: 26, lastUsedDate: '2026-02-08', averageCostJod: 2200, isPreferred: true },
  { id: 'v-tarab', name: 'Tarab Ensemble', category: 'entertainment', rating: 4.8, timesUsed: 8, lastUsedDate: '2025-10-04', averageCostJod: 4100, isPreferred: false },
];

/* Active leads (Section 7.6) ------------------------------------------ */
export const leads: Lead[] = [
  {
    id: 'lead-reem',
    clientId: 'client-reem',
    clientName: 'Reem Al-Khoury',
    eventType: 'wedding',
    estimatedGuestCount: 250,
    preferredVenue: 'Kempinski Ishtar, Dead Sea',
    preferredDate: '2026-10-17',
    tier: 'bespoke',
    source: 'instagram',
    status: 'new',
    receivedHoursAgo: 2,
    assignedTo: 'staff-hadeel',
    rawMessage:
      'Forwarded from Instagram — @reem.alkhoury:\n\n"Hi! A friend whose Four Seasons wedding you produced gave us your name — it was unreal. We\'re planning ours for next October, thinking the Dead Sea, probably Kempinski. Around 250 guests. We want something intimate but still grand — a lot of candlelight, a long reception dinner by the water. Budget is open for the right team. Can we talk?"',
  },
  {
    id: 'lead-bisharat',
    clientId: 'client-bisharat',
    clientName: 'Maha Bisharat',
    eventType: 'private',
    estimatedGuestCount: 60,
    preferredVenue: 'Private estate',
    preferredDate: '2027-03-06',
    tier: 'signature',
    source: 'referral',
    status: 'proposal_sent',
    receivedHoursAgo: 72,
    noteKey: 'awaiting_reply',
    assignedTo: 'staff-tareq',
    rawMessage:
      'Referral from the Husseini family. 30th anniversary dinner, around 60 guests, March 2027. "Something quiet and beautiful — a garden, a small ensemble, a long table." Asked for a proposal.',
  },
  {
    id: 'lead-tarawneh',
    clientId: 'client-tarawneh',
    clientName: 'Daoud Tarawneh',
    eventType: 'corporate',
    estimatedGuestCount: 80,
    preferredVenue: 'TBD — Amman',
    preferredDate: '2027-01-20',
    tier: 'signature',
    source: 'direct',
    status: 'contacted',
    receivedHoursAgo: 26,
    noteKey: 'draft_ready',
    assignedTo: 'staff-tareq',
    rawMessage:
      'Product launch for Tarawneh & Co., ~80 guests, January 2027. Wants a press-friendly evening with a stage moment and a tasting menu. We have a draft scope ready for review.',
  },
  {
    id: 'lead-mansour',
    clientId: 'client-mansour',
    clientName: 'Ali Mansour',
    eventType: 'wedding',
    estimatedGuestCount: 300,
    preferredVenue: 'Undecided',
    preferredDate: '2027-05-01',
    tier: 'bespoke',
    source: 'website',
    status: 'new',
    receivedHoursAgo: 120,
    noteKey: 'scheduled_call',
    assignedTo: 'staff-lina',
    rawMessage:
      'Website inquiry. Wedding for ~300, venue undecided, exploring spring 2027. Call scheduled for Wednesday 4pm to walk through options.',
  },
];

/* Active events (Section 7.5) ----------------------------------------- */
export const activeEvents: ActiveEvent[] = [
  {
    id: 'evt-tabbaa', clientId: 'client-tabbaa', name: 'Tabbaa Wedding', eventType: 'wedding',
    daysFromNow: 6, venue: 'St. Regis Amman', venueAddress: 'Al-Hashmi St, Amman',
    guestCount: 180, tier: 'signature', status: 'in_production', totalBudgetJod: 29000,
    producerName: 'Lina Khoury', tasksTotal: 24, tasksComplete: 22, gradient: G.warm,
  },
  {
    id: 'evt-aramex', clientId: 'client-aramex', name: 'Aramex Annual Conference', eventType: 'conference',
    daysFromNow: 45, venue: 'The Royal Cultural Center', venueAddress: 'Al Hussein Sports City, Amman',
    guestCount: 500, tier: 'signature', status: 'in_production', totalBudgetJod: 40000,
    producerName: 'Tareq Nashawati', tasksTotal: 26, tasksComplete: 14, gradient: G.night,
  },
  {
    id: 'evt-bisharat', clientId: 'client-bisharat', name: 'Bisharat Corporate Evening', eventType: 'corporate',
    daysFromNow: 58, venue: 'Four Seasons Amman', venueAddress: 'Al-Kindi St, 5th Circle, Amman',
    guestCount: 140, tier: 'signature', status: 'in_production', totalBudgetJod: 30000,
    producerName: 'Tareq Nashawati', tasksTotal: 18, tasksComplete: 9, gradient: G.stone,
  },
  {
    id: 'evt-husseini', clientId: 'client-husseini', name: 'Husseini 50th Anniversary', eventType: 'private',
    daysFromNow: 120, venue: 'Le Royal Amman', venueAddress: '3rd Circle, Jabal Amman',
    guestCount: 220, tier: 'signature', status: 'planning', totalBudgetJod: 27000,
    producerName: 'Lina Khoury', tasksTotal: 20, tasksComplete: 4, gradient: G.plum,
  },
  {
    id: 'evt-khoury', leadId: 'lead-reem', clientId: 'client-reem', name: 'Khoury Wedding', eventType: 'wedding',
    daysFromNow: 146, venue: 'Kempinski Ishtar, Dead Sea', venueAddress: 'Sweimeh, Dead Sea Rd',
    guestCount: 250, tier: 'bespoke', status: 'planning', totalBudgetJod: 52000,
    producerName: 'Hadeel Al-Masri', tasksTotal: 16, tasksComplete: 3, gradient: G.deadSea,
  },
  {
    id: 'evt-capitalbank', clientId: 'client-capitalbank', name: 'Capital Bank Retreat', eventType: 'corporate',
    daysFromNow: -1, venue: 'Mövenpick Resort', venueAddress: 'Dead Sea',
    guestCount: 120, tier: 'essentials', status: 'completed', totalBudgetJod: 16500,
    producerName: 'Rana Saleh', tasksTotal: 20, tasksComplete: 20, gradient: G.emerald,
  },
];

/* Past events — The Library (Section 7.4) ----------------------------- */
export const pastEvents: PastEvent[] = [
  { id: 'past-reem-faris', name: 'Reem & Faris Wedding', eventType: 'wedding', date: '2025-06-14', venue: 'Kempinski Ishtar, Dead Sea', guestCount: 280, tier: 'bespoke', budgetJod: 42000, gradient: G.deadSea },
  { id: 'past-aramex-gala', name: 'Aramex 40th Anniversary Gala', eventType: 'gala', date: '2025-11-20', venue: 'Four Seasons Amman', guestCount: 450, tier: 'bespoke', budgetJod: 68000, gradient: G.night },
  { id: 'past-tedx', name: 'TEDxAmman 2025', eventType: 'conference', date: '2025-09-27', venue: 'The Royal Cultural Center', guestCount: 600, tier: 'signature', budgetJod: 35000, gradient: G.stone },
  { id: 'past-tabbaa-eng', name: 'Tabbaa Family Engagement', eventType: 'private', date: '2026-02-08', venue: 'St. Regis Amman', guestCount: 180, tier: 'signature', budgetJod: 28000, gradient: G.warm },
  { id: 'past-capitalbank-summit', name: 'Capital Bank Q4 Leadership Summit', eventType: 'corporate', date: '2026-01-22', venue: 'Mövenpick Resort', guestCount: 120, tier: 'essentials', budgetJod: 16000, gradient: G.emerald },
  { id: 'past-cpf', name: 'Crown Prince Foundation Year-End', eventType: 'gala', date: '2025-12-11', venue: 'Jordan Museum', guestCount: 220, tier: 'signature', budgetJod: 31000, gradient: G.plum },
  { id: 'past-layla-sami', name: 'Layla & Sami Wedding', eventType: 'wedding', date: '2025-10-04', venue: 'Private estate, Naour', guestCount: 320, tier: 'bespoke', budgetJod: 55000, gradient: G.warm },
  { id: 'past-rj-pilots', name: 'Royal Jordanian Pilots Reunion', eventType: 'corporate', date: '2026-03-15', venue: 'Kempinski Amman', guestCount: 200, tier: 'signature', budgetJod: 24000, gradient: G.emerald },
  { id: 'past-daoudi', name: 'Daoudi Wedding', eventType: 'wedding', date: '2026-04-19', venue: 'Dead Sea private villa', guestCount: 150, tier: 'bespoke', budgetJod: 47000, gradient: G.deadSea },
  { id: 'past-husseini-eng', name: 'Husseini Engagement', eventType: 'private', date: '2025-05-30', venue: 'Le Royal Amman', guestCount: 220, tier: 'signature', budgetJod: 26000, gradient: G.plum },
  { id: 'past-bisharat-50', name: 'Bisharat 50th Birthday', eventType: 'private', date: '2025-08-16', venue: 'Private estate', guestCount: 80, tier: 'bespoke', budgetJod: 33000, gradient: G.stone },
  { id: 'past-shomali', name: 'Shomali Corporate Retreat', eventType: 'corporate', date: '2025-07-09', venue: 'Mövenpick Petra', guestCount: 60, tier: 'signature', budgetJod: 19000, gradient: G.night },
];

/* Client-portal magic-link sessions (Section 4 client_sessions) -------- */
export interface ClientSession { token: string; eventId: string; }
export const clientSessions: ClientSession[] = [
  { token: 'reem-deadsea-2026', eventId: 'evt-khoury' },
  { token: 'tabbaa-stregis', eventId: 'evt-tabbaa' },
  { token: 'husseini-leroyal', eventId: 'evt-husseini' },
];

export function findActiveEvent(id: string): ActiveEvent | undefined {
  return activeEvents.find((e) => e.id === id);
}
export function findPastEvent(id: string): PastEvent | undefined {
  return pastEvents.find((e) => e.id === id);
}
export function tokenForEvent(eventId: string): string | undefined {
  return clientSessions.find((s) => s.eventId === eventId)?.token;
}
export function eventForToken(token: string): ActiveEvent | undefined {
  const eventId = clientSessions.find((s) => s.token === token)?.eventId;
  return eventId ? findActiveEvent(eventId) : undefined;
}
