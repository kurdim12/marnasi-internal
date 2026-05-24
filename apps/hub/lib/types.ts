/*
  App-level types. These mirror the canonical Supabase schema in the brief
  (Section 4) field-for-field so the seed fixtures can later be swapped for a
  real backend (D1/Workers or Supabase) without touching the UI layer.
*/

export type Role = 'owner' | 'producer' | 'coordinator' | 'assistant';
export type Locale = 'ar' | 'en';

export type EventType = 'wedding' | 'corporate' | 'gala' | 'private' | 'conference' | 'other';
export type Tier = 'essentials' | 'signature' | 'bespoke';

export type LeadStatus = 'new' | 'contacted' | 'proposal_sent' | 'won' | 'lost' | 'archived';
export type LeadSource = 'website' | 'referral' | 'instagram' | 'direct' | 'other';

export type EventStatus = 'planning' | 'in_production' | 'day_of' | 'completed' | 'archived';

export type VendorCategory =
  | 'catering' | 'floral' | 'photography' | 'videography' | 'lighting'
  | 'sound' | 'venue' | 'decor' | 'entertainment' | 'transport' | 'other';

export interface Profile {
  userId: string;
  email: string;
  fullName: string;
  role: Role;
  /** Emerald-tinted avatar placeholder color. */
  avatarColor: string;
  phone?: string;
  languagePreference: Locale;
}

export interface Client {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  notes?: string;
  languagePreference: Locale;
  isCorporate: boolean;
}

export interface Lead {
  id: string;
  clientId?: string;
  clientName: string;
  eventType: EventType;
  estimatedGuestCount?: number;
  preferredVenue?: string;
  preferredDate?: string;
  tier?: Tier;
  source: LeadSource;
  rawMessage: string;
  status: LeadStatus;
  /** Hours since the inquiry arrived; drives the relative "received" label. */
  receivedHoursAgo: number;
  /** Optional sub-status surfaced as the inbox chip (e.g. "Draft ready"). */
  noteKey?: 'draft_ready' | 'awaiting_reply' | 'scheduled_call';
  assignedTo?: string;
}

/** A gradient pair used to art-direct a card when no photograph is attached. */
export type Gradient = [string, string];

export interface ActiveEvent {
  id: string;
  leadId?: string;
  clientId?: string;
  name: string;
  eventType: EventType;
  /** Relative offset so countdowns read correctly whenever the demo runs. */
  daysFromNow: number;
  venue: string;
  venueAddress?: string;
  guestCount: number;
  tier: Tier;
  status: EventStatus;
  totalBudgetJod: number;
  producerName: string;
  tasksTotal: number;
  tasksComplete: number;
  gradient: Gradient;
  coverImageUrl?: string;
}

export interface PastEvent {
  id: string;
  name: string;
  eventType: EventType;
  /** ISO date of a completed event. */
  date: string;
  venue: string;
  guestCount: number;
  tier: Tier;
  budgetJod: number;
  gradient: Gradient;
  coverImageUrl?: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: VendorCategory;
  contactName?: string;
  phone?: string;
  whatsappNumber?: string;
  rating: number;
  timesUsed: number;
  lastUsedDate?: string;
  averageCostJod?: number;
  isPreferred: boolean;
}
