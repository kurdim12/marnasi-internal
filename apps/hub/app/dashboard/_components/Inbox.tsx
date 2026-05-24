'use client';

import { motion } from 'framer-motion';
import { useI18n, interpolate } from '@/lib/i18n';
import { localizedNumber } from '@/lib/utils';
import type { Lead } from '@/lib/types';
import { cn } from '@/lib/utils';
import { playChime } from '@/lib/sound';

const EASE = [0.16, 1, 0.3, 1] as const;

function isHero(lead: Lead): boolean {
  return lead.status === 'new' && !lead.noteKey;
}

export function Inbox({ leads, onGenerate, onView }: { leads: Lead[]; onGenerate: (l: Lead) => void; onView: (l: Lead) => void }) {
  const { t, locale } = useI18n();

  function monthYear(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en', { month: 'long', year: 'numeric' }).format(d);
  }

  function received(lead: Lead): string {
    if (lead.receivedHoursAgo < 24) {
      return interpolate(t.inbox.receivedHours, { count: localizedNumber(lead.receivedHoursAgo, locale) });
    }
    return interpolate(t.inbox.receivedDays, { count: localizedNumber(Math.round(lead.receivedHoursAgo / 24), locale) });
  }

  function statusChip(lead: Lead): { label: string; className: string } {
    if (lead.noteKey === 'awaiting_reply') return { label: t.inbox.statusAwaitingReply, className: 'bg-maranasi-stone/12 text-maranasi-stone' };
    if (lead.noteKey === 'draft_ready') return { label: t.inbox.statusDraftReady, className: 'bg-maranasi-emerald/10 text-maranasi-emerald' };
    if (lead.noteKey === 'scheduled_call') return { label: t.inbox.statusScheduledCall, className: 'bg-maranasi-warning/15 text-maranasi-warning' };
    return { label: t.inbox.statusNew, className: 'bg-maranasi-gold/20 text-maranasi-emerald-deep' };
  }

  return (
    <div>
      <h2 className="font-display text-2xl text-maranasi-emerald">{t.inbox.title}</h2>
      <div className="mt-4 space-y-3">
        {leads.map((lead, i) => {
          const hero = isHero(lead);
          const chip = statusChip(lead);
          const summary = [
            t.eventTypes[lead.eventType],
            lead.estimatedGuestCount ? interpolate(t.inbox.guests, { count: localizedNumber(lead.estimatedGuestCount, locale) }) : null,
            lead.preferredVenue,
            monthYear(lead.preferredDate),
            lead.tier ? t.tiers[lead.tier] : null,
          ].filter(Boolean).join('  ·  ');

          return (
            <motion.article
              key={lead.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.3 + i * 0.04 }}
              className={cn('surface p-4', hero && 'glow-pulse border-maranasi-gold/40')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-xl leading-tight text-maranasi-ink">{lead.clientName}</h3>
                  <p className="text-tiny mt-1 text-maranasi-stone">{received(lead)}</p>
                </div>
                <span className={cn('chip shrink-0', chip.className)}>{chip.label}</span>
              </div>

              <p className="text-small mt-3 text-maranasi-ink/75">{summary}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {hero ? (
                  <>
                    <button type="button" onClick={() => { playChime(); onGenerate(lead); }} className="btn btn-primary">
                      {t.inbox.generateProposal}
                    </button>
                    <button type="button" onClick={() => onView(lead)} className="btn btn-ghost">
                      {t.inbox.viewDetails}
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => onView(lead)} className="btn btn-ghost">
                    {t.inbox.viewDetails}
                  </button>
                )}
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
