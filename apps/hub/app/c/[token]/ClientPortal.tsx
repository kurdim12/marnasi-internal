'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, ChevronDown } from 'lucide-react';
import { useI18n, interpolate } from '@/lib/i18n';
import { cn, formatJod, localizedNumber } from '@/lib/utils';
import { MaranasiLogo } from '@/components/MaranasiLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Avatar } from '@/components/Avatar';
import type { ActiveEvent } from '@/lib/types';

const EASE = [0.16, 1, 0.3, 1] as const;

const MOOD = [
  ['#0B3D2E', '#1f6b63'], ['#14543f', '#9c7f3f'], ['#07291f', '#0B3D2E'], ['#221d2e', '#14543f'],
  ['#1f6b63', '#0B3D2E'], ['#9c7f3f', '#14543f'], ['#0B3D2E', '#3a4a40'], ['#14543f', '#1f6b63'],
] as const;

function remaining(targetMs: number) {
  const diff = Math.max(0, targetMs - Date.now());
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

export function ClientPortal({
  event, targetIso, producerName, producerPhone, producerColor, clientName,
}: {
  event: ActiveEvent;
  targetIso: string;
  producerName: string;
  producerPhone?: string;
  producerColor: string;
  clientName: string;
}) {
  const { t, locale, dir } = useI18n();
  const targetMs = new Date(targetIso).getTime();
  const [time, setTime] = useState(() => remaining(targetMs));
  const [decision, setDecision] = useState<'none' | 'approved' | 'requested'>('none');

  useEffect(() => {
    const id = setInterval(() => setTime(remaining(targetMs)), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const cp = t.clientPortal;
  const eyebrow = event.eventType === 'wedding' ? cp.eyebrowWedding : cp.eyebrowEvent;
  const fullDate = new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(targetIso));
  const units: [number, string][] = [[time.d, cp.units.days], [time.h, cp.units.hours], [time.m, cp.units.minutes], [time.s, cp.units.seconds]];
  const wa = producerPhone ? `https://wa.me/${producerPhone.replace(/[^0-9]/g, '')}` : undefined;

  const tiers = [
    { key: 'essentials' as const, total: 34000 },
    { key: 'signature' as const, total: 48000 },
    { key: 'bespoke' as const, total: 62000 },
  ];

  return (
    <main dir={dir} className="min-h-dvh bg-maranasi-bone">
      {/* Hero: cinematic live countdown */}
      <section className="relative flex min-h-dvh flex-col overflow-hidden text-maranasi-cream" style={{ background: `linear-gradient(160deg, ${event.gradient[0]}, ${event.gradient[1]})` }}>
        <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(70% 50% at 50% 20%, rgba(201,169,97,0.2), transparent 65%)' }} />
        <header className="relative flex items-center justify-between px-5 py-5">
          <MaranasiLogo tone="cream" className="text-base" />
          <LanguageToggle tone="cream" />
        </header>

        <div className="relative flex flex-1 flex-col items-center justify-center px-5 text-center">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, ease: EASE }} className="text-tiny text-maranasi-champagne">
            {eyebrow}
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.1 }} className="font-display mt-3 text-4xl leading-tight sm:text-5xl">
            {event.name}
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, ease: EASE, delay: 0.2 }} className="text-body numeral mt-2 text-maranasi-cream/85">
            {event.venue} · {fullDate}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.3 }} className="mt-10 flex items-start gap-4 sm:gap-7">
            {units.map(([n, label]) => (
              <div key={label} className="min-w-[52px]">
                <p className="numeral font-display text-4xl leading-none sm:text-6xl">{localizedNumber(n, locale)}</p>
                <p className="text-tiny mt-2 text-maranasi-cream/70">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="relative flex justify-center pb-6 text-maranasi-cream/60">
          <ChevronDown size={20} className="animate-bounce" />
        </div>
      </section>

      {/* Body */}
      <div className="mx-auto w-full max-w-[760px] px-5 py-14">
        {/* Proposal */}
        <section>
          <p className="text-tiny text-maranasi-stone">{cp.proposalNote}</p>
          <h2 className="font-display mt-1 text-3xl text-maranasi-emerald">{cp.proposal}</h2>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {tiers.map((tier, i) => (
              <div key={tier.key} className={cn('rounded-card border p-4 text-center', i === 2 ? 'border-maranasi-gold bg-maranasi-emerald text-maranasi-cream' : 'border-maranasi-line bg-maranasi-cream')}>
                <p className={cn('text-tiny', i === 2 ? 'text-maranasi-champagne' : 'text-maranasi-stone')}>{t.tiers[tier.key]}</p>
                <p className="font-display numeral mt-1 text-xl">{formatJod(tier.total, locale)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Mood board */}
        <section className="mt-14">
          <h2 className="font-display text-3xl text-maranasi-emerald">{cp.moodboard}</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MOOD.map((g, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                transition={{ duration: 0.6, ease: EASE, delay: (i % 4) * 0.06 }}
                className="aspect-square rounded-image"
                style={{ background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }}
              />
            ))}
          </div>
        </section>

        {/* Journey / timeline */}
        <section className="mt-14">
          <h2 className="font-display text-3xl text-maranasi-emerald">{cp.journey}</h2>
          <ol className="mt-5 space-y-3">
            {['Proposal', 'Mood board', 'Vendors confirmed', 'Walkthrough', 'The day', 'Highlight film'].map((m, i) => (
              <li key={m} className="flex items-center gap-3">
                <span className={cn('h-2 w-2 rounded-full', i < 2 ? 'bg-maranasi-gold' : 'bg-maranasi-stone-soft')} />
                <span className="text-body text-maranasi-ink/80">{m}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Producer */}
        <section className="mt-14 flex items-center gap-4 rounded-card border border-maranasi-line bg-maranasi-cream p-5">
          <Avatar name={producerName} color={producerColor} size={48} />
          <div className="min-w-0">
            <p className="text-tiny text-maranasi-stone">{cp.producer}</p>
            <p className="text-body font-medium text-maranasi-ink">{producerName}</p>
          </div>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-ghost ms-auto">
              <MessageCircle size={15} /> {cp.message}
            </a>
          )}
        </section>

        {/* Approve / Request */}
        <section className="mt-10">
          {decision === 'none' ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => setDecision('approved')} className="btn btn-primary flex-1">{cp.approve}</button>
              <button type="button" onClick={() => setDecision('requested')} className="btn btn-ghost flex-1">{cp.requestChanges}</button>
            </div>
          ) : (
            <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="font-display text-center text-2xl text-maranasi-emerald">
              {decision === 'approved' ? cp.approved : cp.requested}
            </motion.p>
          )}
        </section>
      </div>
    </main>
  );
}
