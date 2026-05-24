'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useI18n, interpolate } from '@/lib/i18n';
import { localizedNumber } from '@/lib/utils';
import type { PastEvent } from '@/lib/types';

const EASE = [0.16, 1, 0.3, 1] as const;

export function Library({ pastEvents }: { pastEvents: PastEvent[] }) {
  const { t, locale } = useI18n();
  const items = [...pastEvents].sort((a, b) => +new Date(b.date) - +new Date(a.date));

  function monthYear(iso: string): string {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en', { month: 'short', year: 'numeric' }).format(new Date(iso));
  }

  return (
    <div>
      <div className="flex items-end justify-between">
        <h2 className="font-display text-2xl text-maranasi-emerald">{t.library.title}</h2>
        <span className="text-tiny text-maranasi-stone">{t.library.subtitle}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map((ev, i) => (
          <motion.article
            key={ev.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE, delay: 0.05 * (i % 4) }}
            className="surface group overflow-hidden p-0"
          >
            <Link href={`/events/${ev.id}`} className="block transition-transform duration-200 hover:-translate-y-0.5">
              <div
                className="relative flex h-36 flex-col justify-end p-4 text-maranasi-cream"
                style={{ background: `linear-gradient(150deg, ${ev.gradient[0]}, ${ev.gradient[1]})` }}
              >
                <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(7,41,31,0.5), transparent 70%)' }} />
                <span className="text-tiny absolute end-3 top-3 rounded-btn bg-white/15 px-2 py-0.5">{t.tiers[ev.tier]}</span>
                <h3 className="font-display relative text-xl leading-tight">{ev.name}</h3>
              </div>

              <div className="p-4">
                <p className="text-small text-maranasi-ink/70">
                  {monthYear(ev.date)}  ·  {ev.venue}
                </p>
                <p className="text-tiny mt-1 text-maranasi-stone">
                  {interpolate(t.library.guests, { count: localizedNumber(ev.guestCount, locale) })}
                </p>
                <span className="text-tiny mt-3 inline-block text-maranasi-emerald transition-colors group-hover:text-maranasi-gold-deep">
                  {t.library.viewCaseStudy} →
                </span>
              </div>
            </Link>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
