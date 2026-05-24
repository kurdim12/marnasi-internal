'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useI18n, interpolate } from '@/lib/i18n';
import { firstName, localizedNumber, timeOfDay } from '@/lib/utils';
import { MaranasiLogo } from '@/components/MaranasiLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Avatar } from '@/components/Avatar';
import { TASKS_THIS_WEEK } from '@/lib/seed';
import type { Lead } from '@/lib/types';
import { signOutAction } from '../actions';
import { Inbox } from './Inbox';
import { ActiveEvents } from './ActiveEvents';
import { Library } from './Library';
import { GenerateProposalModal } from './GenerateProposalModal';

const EASE = [0.16, 1, 0.3, 1] as const;

export function Dashboard({ userName, avatarColor }: { userName: string; avatarColor: string }) {
  const { t, locale, dir } = useI18n();
  const [modal, setModal] = useState<{ lead: Lead; autoStart: boolean } | null>(null);

  const greetingWord =
    timeOfDay() === 'morning' ? t.dashboard.greetingMorning
    : timeOfDay() === 'afternoon' ? t.dashboard.greetingAfternoon
    : t.dashboard.greetingEvening;

  const greeting = interpolate(t.dashboard.greetingLine, { greeting: greetingWord, name: firstName(userName) });
  const tasks = interpolate(t.dashboard.tasksLine, { count: localizedNumber(TASKS_THIS_WEEK, locale) });

  return (
    <div dir={dir} className="relative min-h-dvh bg-maranasi-bone">
      {/* fade-from-white, completing the cinematic hand-off from /login */}
      <motion.div
        aria-hidden
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.65, ease: EASE }}
        className="pointer-events-none fixed inset-0 z-50 bg-maranasi-bone"
        style={{ display: 'block' }}
        onAnimationComplete={(d) => { /* overlay is non-interactive once faded */ void d; }}
      />

      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8 md:py-8">
        {/* Top bar */}
        <header className="flex items-center justify-between">
          <MaranasiLogo className="text-xl" />
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Avatar name={userName} color={avatarColor} size={34} />
            <form action={signOutAction}>
              <button type="submit" className="text-tiny text-maranasi-stone transition-colors hover:text-maranasi-emerald">
                {t.dashboard.signOut}
              </button>
            </form>
          </div>
        </header>

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
          className="mt-8 md:mt-10"
        >
          <h1 className="text-h1 text-maranasi-emerald">{greeting}</h1>
          <p className="text-body mt-1 text-maranasi-stone">{tasks}</p>
        </motion.div>

        {/* Zones 1 + 2 */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <section className="lg:col-span-2">
            <Inbox
              onGenerate={(lead) => setModal({ lead, autoStart: true })}
              onView={(lead) => setModal({ lead, autoStart: false })}
            />
          </section>
          <section className="lg:col-span-3">
            <ActiveEvents />
          </section>
        </div>

        {/* Zone 3 */}
        <section className="mt-10">
          <Library />
        </section>
      </div>

      {modal && (
        <GenerateProposalModal
          lead={modal.lead}
          autoStart={modal.autoStart}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
