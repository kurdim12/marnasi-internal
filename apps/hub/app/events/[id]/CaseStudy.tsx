'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useI18n, interpolate } from '@/lib/i18n';
import { formatJod, localizedNumber } from '@/lib/utils';
import { MaranasiLogo } from '@/components/MaranasiLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { vendors } from '@/lib/seed';
import type { PastEvent } from '@/lib/types';

const EASE = [0.16, 1, 0.3, 1] as const;

export function CaseStudy({ event }: { event: PastEvent }) {
  const { t, locale, dir } = useI18n();
  const year = new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en', { year: 'numeric' }).format(new Date(event.date));
  const credits = vendors.filter((v) => v.isPreferred).slice(0, 6);

  const stats: [string, string][] = [
    [t.caseStudy.guests, localizedNumber(event.guestCount, locale)],
    [t.caseStudy.budget, `${formatJod(event.budgetJod, locale)} ${t.common.jod}`],
    [t.caseStudy.year, year],
  ];

  return (
    <div dir={dir} className="min-h-dvh bg-maranasi-bone">
      {/* Cinematic hero */}
      <div className="relative flex min-h-[52dvh] flex-col justify-between overflow-hidden p-6 text-maranasi-cream md:p-10" style={{ background: `linear-gradient(135deg, ${event.gradient[0]}, ${event.gradient[1]})` }}>
        <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 50% at 80% 10%, rgba(201,169,97,0.22), transparent 60%)' }} />
        <header className="relative flex items-center justify-between">
          <Link href="/dashboard" className="text-tiny inline-flex items-center gap-1.5 text-maranasi-cream/80 transition-colors hover:text-maranasi-cream">
            <ArrowLeft size={14} className="rtl:hidden" /><ArrowRight size={14} className="hidden rtl:inline" />
            {t.caseStudy.back}
          </Link>
          <MaranasiLogo tone="cream" className="text-base" />
        </header>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }} className="relative">
          <p className="text-tiny text-maranasi-champagne">{t.caseStudy.eyebrow}</p>
          <h1 className="font-display mt-2 text-4xl leading-tight md:text-6xl">{event.name}</h1>
          <p className="text-body mt-3 text-maranasi-cream/85">{event.venue}</p>
        </motion.div>
      </div>

      <div className="mx-auto w-full max-w-[1000px] px-4 py-10 md:px-8">
        <div className="grid grid-cols-3 gap-4">
          {stats.map(([label, value]) => (
            <div key={label} className="surface p-5 text-center">
              <p className="font-display numeral text-2xl text-maranasi-emerald md:text-3xl">{value}</p>
              <p className="text-tiny mt-1 text-maranasi-stone">{label}</p>
            </div>
          ))}
        </div>

        <p className="text-body mx-auto mt-10 max-w-prose text-center text-maranasi-ink/75">{t.caseStudy.overview}</p>

        <div className="mt-12">
          <p className="text-tiny text-center text-maranasi-stone">{t.caseStudy.team}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {credits.map((v) => (
              <span key={v.id} className="text-small text-maranasi-ink/80">{v.name}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
