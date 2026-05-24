'use client';

import { motion } from 'framer-motion';
import { useI18n, interpolate } from '@/lib/i18n';
import { localizedNumber } from '@/lib/utils';
import { activeEvents } from '@/lib/seed';
import type { ActiveEvent } from '@/lib/types';
import { ProgressRing } from '@/components/ProgressRing';

const EASE = [0.16, 1, 0.3, 1] as const;

function ordered(): ActiveEvent[] {
  return [...activeEvents].sort((a, b) => {
    const ac = a.daysFromNow < 0, bc = b.daysFromNow < 0;
    if (ac !== bc) return ac ? 1 : -1; // completed events trail
    return a.daysFromNow - b.daysFromNow;
  });
}

export function ActiveEvents() {
  const { t, locale } = useI18n();

  function countdown(ev: ActiveEvent): string {
    if (ev.daysFromNow < 0) return t.events.completedAgo;
    if (ev.daysFromNow === 0) return t.events.today;
    if (ev.daysFromNow === 1) return t.events.oneDayOut;
    return interpolate(t.events.daysOut, { count: localizedNumber(ev.daysFromNow, locale) });
  }

  return (
    <div>
      <h2 className="font-display text-2xl text-maranasi-emerald">{t.events.title}</h2>
      <div className="no-scrollbar mt-4 flex gap-4 overflow-x-auto pb-2">
        {ordered().map((ev, i) => {
          const pct = Math.round((ev.tasksComplete / ev.tasksTotal) * 100);
          const done = ev.daysFromNow < 0;
          return (
            <motion.article
              key={ev.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.3 + i * 0.05 }}
              className="relative flex h-[208px] w-[264px] shrink-0 flex-col justify-between overflow-hidden rounded-card p-5 text-maranasi-cream"
              style={{ background: `linear-gradient(135deg, ${ev.gradient[0]}, ${ev.gradient[1]})` }}
            >
              {/* depth: bottom shade for legibility + faint top glow */}
              <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(80% 60% at 80% 0%, rgba(201,169,97,0.18), transparent 60%)' }} />
              <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3" style={{ background: 'linear-gradient(to top, rgba(7,41,31,0.55), transparent)' }} />

              <div className="relative flex items-start justify-between">
                <span className="text-tiny rounded-btn bg-white/15 px-2 py-1 text-maranasi-cream">{t.tiers[ev.tier]}</span>
                <ProgressRing value={pct} size={42} stroke={3}>
                  <span className="numeral text-[11px] font-medium text-maranasi-cream">{localizedNumber(pct, locale)}%</span>
                </ProgressRing>
              </div>

              <div className="relative">
                <h3 className="font-display text-2xl leading-tight">{ev.name}</h3>
                <p className="text-small mt-1 text-maranasi-cream/80">{ev.venue}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className={done ? 'text-small text-maranasi-cream/70' : 'font-display text-xl'}>{countdown(ev)}</span>
                  <span className="text-small text-maranasi-cream/80">
                    {interpolate(t.events.guests, { count: localizedNumber(ev.guestCount, locale) })}
                  </span>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
