'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, X, Download, Send, ArrowLeft } from 'lucide-react';
import { useI18n, interpolate } from '@/lib/i18n';
import { cn, formatJod, localizedNumber } from '@/lib/utils';
import { pastEvents, vendors, activeEvents, tokenForEvent } from '@/lib/seed';
import type { Lead } from '@/lib/types';
import { MaranasiLogo } from '@/components/MaranasiLogo';
import { playChime } from '@/lib/sound';

const EASE = [0.16, 1, 0.3, 1] as const;
const STEP_MS = [400, 600, 800, 700, 1000, 2500];

const MOOD_GRADIENTS = [
  ['#0B3D2E', '#1f6b63'],
  ['#14543f', '#9c7f3f'],
  ['#07291f', '#0B3D2E'],
  ['#221d2e', '#14543f'],
] as const;

type Phase = 'idle' | 'running' | 'done' | 'sent';

export function GenerateProposalModal({ lead, autoStart, onClose }: { lead: Lead; autoStart: boolean; onClose: () => void }) {
  const { t, locale, dir } = useI18n();
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('idle');
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState(0);
  const cancelled = useRef(false);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (autoStart) start();
    return () => { cancelled.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function start() {
    setPhase('running');
    setStep(0);
    const run = (i: number) => {
      if (cancelled.current) return;
      if (i >= STEP_MS.length) { setPhase('done'); return; }
      setStep(i);
      setTimeout(() => run(i + 1), reduce ? 120 : STEP_MS[i]);
    };
    run(0);
  }

  // Cycle mood tiles while generating.
  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => setMood((m) => (m + 1) % MOOD_GRADIENTS.length), 1500);
    return () => clearInterval(id);
  }, [phase]);

  return (
    <div dir={dir} className="fixed inset-0 z-[60] flex items-end justify-center">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-maranasi-emerald-deep/55 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 0.5, ease: EASE }}
        className="relative flex h-[88dvh] w-full max-w-[1440px] flex-col overflow-hidden rounded-t-[20px] bg-maranasi-bone shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-maranasi-line px-5 py-4 md:px-8">
          <MaranasiLogo className="text-lg" />
          <button type="button" onClick={onClose} className="rounded-btn p-2 text-maranasi-stone transition-colors hover:bg-maranasi-emerald/5 hover:text-maranasi-emerald" aria-label={t.deck.close}>
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {(phase === 'idle' || phase === 'running') && (
            <div className="grid h-full grid-cols-1 md:grid-cols-2">
              <LeadDetails lead={lead} />
              <div className="flex flex-col justify-center bg-maranasi-emerald p-6 text-maranasi-cream md:p-10">
                {phase === 'idle' ? (
                  <Idle name={lead.clientName} onStart={start} />
                ) : (
                  <Running step={step} mood={mood} />
                )}
              </div>
            </div>
          )}

          {phase === 'done' && <DeckReveal lead={lead} onSend={() => setPhase('sent')} />}
          {phase === 'sent' && <PortalPreview lead={lead} onBack={() => setPhase('done')} />}
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function LeadDetails({ lead }: { lead: Lead }) {
  const { t, locale } = useI18n();
  const rows: [string, string | undefined][] = [
    [t.deck.fields.eventType, t.eventTypes[lead.eventType]],
    [t.deck.fields.guests, lead.estimatedGuestCount ? localizedNumber(lead.estimatedGuestCount, locale) : undefined],
    [t.deck.fields.venue, lead.preferredVenue],
    [t.deck.fields.date, lead.preferredDate ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(lead.preferredDate)) : undefined],
    [t.deck.fields.tier, lead.tier ? t.tiers[lead.tier] : undefined],
  ];
  return (
    <div className="p-6 md:p-10">
      <p className="text-tiny text-maranasi-stone">{t.deck.leadDetails}</p>
      <h2 className="font-display mt-1 text-3xl text-maranasi-emerald">{lead.clientName}</h2>
      <dl className="mt-6 space-y-3">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 border-b border-maranasi-line pb-3">
            <dt className="text-small text-maranasi-stone">{k}</dt>
            <dd className="text-small text-end font-medium text-maranasi-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-tiny mt-6 text-maranasi-stone">{t.deck.rawMessage}</p>
      <p className="text-small mt-2 whitespace-pre-line text-maranasi-ink/75">{lead.rawMessage}</p>
    </div>
  );
}

function Idle({ name, onStart }: { name: string; onStart: () => void }) {
  const { t } = useI18n();
  return (
    <div>
      <h2 className="text-h2 text-maranasi-cream">{interpolate(t.deck.generatingFor, { name })}</h2>
      <button type="button" onClick={() => { playChime(); onStart(); }} className="btn btn-gold mt-8">{t.deck.generate}</button>
    </div>
  );
}

function Running({ step, mood }: { step: number; mood: number }) {
  const { t } = useI18n();
  const steps = t.deck.steps;
  return (
    <div>
      <div className="relative mb-8 h-40 overflow-hidden rounded-card">
        <AnimatePresence>
          <motion.div
            key={mood}
            initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${MOOD_GRADIENTS[mood][0]}, ${MOOD_GRADIENTS[mood][1]})` }}
          />
        </AnimatePresence>
        <span aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(70% 60% at 70% 20%, rgba(201,169,97,0.22), transparent 60%)' }} />
      </div>
      <ul className="space-y-3">
        {steps.map((line, i) => {
          const state = i < step ? 'done' : i === step ? 'active' : 'pending';
          return (
            <li key={i} className={cn('flex items-center gap-3 text-small transition-opacity', state === 'pending' ? 'opacity-35' : 'opacity-100')}>
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                {state === 'done' ? (
                  <Check size={16} className="text-maranasi-gold" />
                ) : state === 'active' ? (
                  <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.1, repeat: Infinity }} className="h-2 w-2 rounded-full bg-maranasi-gold" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-maranasi-cream/30" />
                )}
              </span>
              <span className="text-maranasi-cream/90">{line}…</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------- The deck -------------------------------- */

function DeckReveal({ lead, onSend }: { lead: Lead; onSend: () => void }) {
  const { t } = useI18n();
  const slides = buildDeck();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 px-5 py-3 md:px-8">
        <p className="text-body text-maranasi-emerald">{t.deck.ready}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => window.print()} className="btn btn-ghost"><Download size={15} /> {t.deck.downloadPdf}</button>
          <button type="button" onClick={() => window.print()} className="btn btn-ghost">{t.deck.downloadPptx}</button>
          <button type="button" onClick={onSend} className="btn btn-primary"><Send size={15} /> {t.deck.sendToClient}</button>
        </div>
      </div>
      <div className="no-scrollbar flex flex-1 snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-8 md:px-8">
        {slides.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: i * 0.04 }}
            className="aspect-[16/10] w-[min(86vw,720px)] shrink-0 snap-center overflow-hidden rounded-card shadow-sm"
          >
            {s}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function buildDeck(): React.ReactNode[] {
  // Built once; reads from the shared seed so the deck reflects real comparable
  // events and top-rated vendors. Headings localize via the t() consumer below.
  return [
    <CoverSlide key="cover" />,
    <VisionSlide key="vision" />,
    <VenueSlide key="venue" />,
    <ExperienceSlide key="exp" />,
    <VendorSlide key="vendors" />,
    <BudgetSlide key="budget" />,
    <TimelineSlide key="timeline" />,
    <CredentialsSlide key="cred" />,
  ];
}

function SlideShell({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return <div className={cn('flex h-full w-full flex-col p-8 md:p-10', dark ? 'bg-maranasi-emerald text-maranasi-cream' : 'bg-maranasi-cream text-maranasi-ink')}>{children}</div>;
}

function SlideTitle({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return <h3 className={cn('font-display text-3xl', dark ? 'text-maranasi-cream' : 'text-maranasi-emerald')}>{children}</h3>;
}

function CoverSlide() {
  const { t, locale } = useI18n();
  return (
    <div className="relative flex h-full w-full flex-col justify-between bg-maranasi-emerald p-10 text-maranasi-cream" style={{ background: 'linear-gradient(135deg,#0B3D2E,#1f6b63)' }}>
      <span aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(60% 50% at 75% 15%, rgba(201,169,97,0.22), transparent 60%)' }} />
      <MaranasiLogo tone="cream" className="relative text-lg" />
      <div className="relative">
        <p className="text-tiny text-maranasi-champagne">{t.deck.cover.kicker}</p>
        <h2 className="font-display mt-2 text-5xl leading-none">Reem Al-Khoury</h2>
        <p className="text-body mt-3 text-maranasi-cream/85">Kempinski Ishtar · Dead Sea · {new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en', { month: 'long', year: 'numeric' }).format(new Date('2026-10-17'))}</p>
      </div>
    </div>
  );
}

function VisionSlide() {
  const { t } = useI18n();
  return (
    <SlideShell>
      <SlideTitle>{t.deck.slides.vision}</SlideTitle>
      <p className="text-body mt-5 max-w-prose text-maranasi-ink/80">
        An intimate-yet-grand celebration at the water’s edge: a long candlelit reception dinner, warm gold light against the Dead Sea at dusk, and a guest journey that unfolds slowly across the evening for 250 guests.
      </p>
      <div className="mt-auto flex gap-6 pt-6">
        {['Candlelight', 'Long-table dining', 'Live Tarab', 'Sunset ceremony'].map((m) => (
          <span key={m} className="text-tiny text-maranasi-stone">{m}</span>
        ))}
      </div>
    </SlideShell>
  );
}

function VenueSlide() {
  const { t, locale } = useI18n();
  const comps = ['past-reem-faris', 'past-daoudi', 'past-layla-sami'].map((id) => pastEvents.find((p) => p.id === id)!);
  return (
    <SlideShell dark>
      <SlideTitle dark>{t.deck.slides.venue}</SlideTitle>
      <p className="text-body mt-4 text-maranasi-cream/85">Kempinski Ishtar, Dead Sea — a waterfront sequence of terraces we know intimately.</p>
      <p className="text-tiny mt-7 text-maranasi-champagne">{t.deck.slides.comparable}</p>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {comps.map((c) => (
          <div key={c.id} className="rounded-image bg-white/10 p-3">
            <p className="text-small font-medium">{c.name}</p>
            <p className="text-tiny mt-1 text-maranasi-cream/70">{interpolate(t.events.guests, { count: localizedNumber(c.guestCount, locale) })}</p>
            <p className="text-tiny mt-2 text-maranasi-champagne">{formatJod(c.budgetJod, locale)} {t.common.jod}</p>
          </div>
        ))}
      </div>
    </SlideShell>
  );
}

function ExperienceSlide() {
  const { t } = useI18n();
  const flow = ['Arrival & welcome', 'Sunset ceremony', 'Cocktail terrace', 'Long-table dinner', 'Tarab & dancing', 'Midnight send-off'];
  return (
    <SlideShell>
      <SlideTitle>{t.deck.slides.experience}</SlideTitle>
      <ol className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3">
        {flow.map((f, i) => (
          <li key={f} className="flex items-baseline gap-3">
            <span className="numeral font-display text-xl text-maranasi-gold-deep">{String(i + 1).padStart(2, '0')}</span>
            <span className="text-body text-maranasi-ink/80">{f}</span>
          </li>
        ))}
      </ol>
    </SlideShell>
  );
}

function VendorSlide() {
  const { t } = useI18n();
  const ids = ['v-talet', 'v-rosesco', 'v-studiovert', 'v-cinematicjo', 'v-glow', 'v-tarab'];
  const picks = ids.map((id) => vendors.find((v) => v.id === id)!);
  return (
    <SlideShell>
      <SlideTitle>{t.deck.slides.vendors}</SlideTitle>
      <p className="text-tiny mt-2 text-maranasi-stone">{t.deck.slides.vendorsNote}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {picks.map((v) => (
          <div key={v.id} className="surface flex items-center justify-between p-3">
            <div>
              <p className="text-small font-medium text-maranasi-ink">{v.name}</p>
              <p className="text-tiny text-maranasi-stone capitalize">{v.category}</p>
            </div>
            <span className="numeral text-small font-medium text-maranasi-gold-deep">{v.rating.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </SlideShell>
  );
}

function BudgetSlide() {
  const { t, locale } = useI18n();
  const tiers = [
    { key: 'essentials' as const, total: 34000, items: ['Venue & catering', 'Florals', 'Photography', 'Coordination'] },
    { key: 'signature' as const, total: 48000, items: ['+ Cinematic film', '+ Premium lighting', '+ Live ensemble', '+ Enhanced florals'] },
    { key: 'bespoke' as const, total: 62000, items: ['+ Full design atelier', '+ Tarab ensemble', '+ Custom builds', '+ Guest experience'] },
  ];
  return (
    <SlideShell>
      <SlideTitle>{t.deck.slides.budget}</SlideTitle>
      <div className="mt-5 grid flex-1 grid-cols-3 gap-3">
        {tiers.map((tier, i) => (
          <div key={tier.key} className={cn('flex flex-col rounded-card border p-4', i === 2 ? 'border-maranasi-gold bg-maranasi-emerald text-maranasi-cream' : 'border-maranasi-line bg-white')}>
            <p className={cn('text-tiny', i === 2 ? 'text-maranasi-champagne' : 'text-maranasi-stone')}>{t.tiers[tier.key]}</p>
            <p className="font-display mt-1 text-2xl">{formatJod(tier.total, locale)}</p>
            <p className={cn('text-tiny', i === 2 ? 'text-maranasi-cream/70' : 'text-maranasi-stone')}>{t.common.jod}</p>
            <ul className="mt-3 space-y-1.5">
              {tier.items.map((it) => (
                <li key={it} className={cn('text-tiny', i === 2 ? 'text-maranasi-cream/85' : 'text-maranasi-ink/70')}>{it}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SlideShell>
  );
}

function TimelineSlide() {
  const { t } = useI18n();
  const milestones = ['Proposal & contract', 'Mood board approved', 'Vendor confirmations', 'Tasting & walkthrough', 'Rehearsal', 'Wedding day', 'Highlight film'];
  return (
    <SlideShell dark>
      <SlideTitle dark>{t.deck.slides.timeline}</SlideTitle>
      <ol className="mt-6 space-y-3">
        {milestones.map((m, i) => (
          <li key={m} className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-maranasi-gold" />
            <span className="text-body text-maranasi-cream/85">{m}</span>
            {i === milestones.length - 2 && <span className="text-tiny ms-auto text-maranasi-champagne">17 Oct 2026</span>}
          </li>
        ))}
      </ol>
    </SlideShell>
  );
}

function CredentialsSlide() {
  const { t, locale } = useI18n();
  const stats = [
    { n: '12+', l: 'years' },
    { n: localizedNumber(450, locale), l: 'guests, gala' },
    { n: '4.9', l: 'vendor rating' },
  ];
  return (
    <div className="relative flex h-full w-full flex-col justify-between bg-maranasi-emerald p-10 text-maranasi-cream" style={{ background: 'linear-gradient(135deg,#07291f,#0B3D2E)' }}>
      <SlideTitle dark>{t.deck.slides.credentials}</SlideTitle>
      <div className="grid grid-cols-3 gap-6">
        {stats.map((s) => (
          <div key={s.l}>
            <p className="numeral font-display text-4xl text-maranasi-gold">{s.n}</p>
            <p className="text-tiny mt-1 text-maranasi-cream/70">{s.l}</p>
          </div>
        ))}
      </div>
      <MaranasiLogo tone="cream" className="text-lg" />
    </div>
  );
}

/* --------------------- Client portal preview ----------------------- */

function PortalPreview({ lead, onBack }: { lead: Lead; onBack: () => void }) {
  const { t, locale } = useI18n();
  const linkedEvent = activeEvents.find((e) => e.leadId === lead.id);
  const portalToken = linkedEvent ? tokenForEvent(linkedEvent.id) : undefined;
  const target = new Date(lead.preferredDate ?? '2026-10-17').getTime();
  const diff = Math.max(0, target - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const parts: [number, string][] = [[days, t.deck.units.days], [hours, t.deck.units.hours], [minutes, t.deck.units.minutes]];

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-3 md:px-8">
        <button type="button" onClick={onBack} className="btn btn-ghost"><ArrowLeft size={15} /> {t.deck.back}</button>
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-8 text-center text-maranasi-cream" style={{ background: 'linear-gradient(135deg,#0B3D2E,#1f6b63)' }}>
        <span aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(60% 50% at 50% 20%, rgba(201,169,97,0.2), transparent 60%)' }} />
        <p className="text-tiny relative text-maranasi-champagne">{t.deck.portalEyebrow}</p>
        <h2 className="font-display relative mt-2 text-4xl">{lead.clientName}</h2>
        <div className="relative mt-8 flex items-end gap-6">
          {parts.map(([n, label]) => (
            <div key={label} className="min-w-16">
              <p className="numeral font-display text-5xl leading-none">{localizedNumber(n, locale)}</p>
              <p className="text-tiny mt-2 text-maranasi-cream/70">{label}</p>
            </div>
          ))}
        </div>
        <p className="text-body relative mt-10 max-w-md text-maranasi-cream/85">{t.deck.sentBody}</p>
        {portalToken && (
          <a href={`/c/${portalToken}`} target="_blank" rel="noopener noreferrer" className="btn btn-gold relative mt-8">
            {t.eventDetail.portal.open}
          </a>
        )}
      </div>
    </div>
  );
}
