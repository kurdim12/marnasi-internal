'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n';
import { MaranasiLogo } from '@/components/MaranasiLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { signInAction } from './actions';

const EASE = [0.16, 1, 0.3, 1] as const;

export function LoginForm() {
  const { t, dir } = useI18n();
  const router = useRouter();
  // Prefilled with the demo owner account so the pitch is one click — editable.
  const [email, setEmail] = useState('hadeel@maranasi.com');
  const [password, setPassword] = useState('maranasi');
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entering, setEntering] = useState(false);

  useEffect(() => { router.prefetch('/dashboard'); }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || entering) return;
    setError(false);
    setSubmitting(true);
    const res = await signInAction(email, password);
    if (!res.ok) {
      setError(true);
      setSubmitting(false);
      return;
    }
    // Cinematic hand-off: slow fade to white (~800ms), then into the dashboard.
    setEntering(true);
    setTimeout(() => router.replace('/dashboard'), 820);
  }

  return (
    <main dir={dir} className="relative flex min-h-dvh flex-col bg-maranasi-emerald text-maranasi-cream">
      <div className="absolute end-5 top-5 z-10">
        <LanguageToggle tone="cream" />
      </div>

      {/* soft radial glow for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: 'radial-gradient(60% 50% at 50% 38%, rgba(201,169,97,0.16), transparent 70%)' }}
      />

      <div className="relative z-[1] flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
            <MaranasiLogo tone="cream" className="text-2xl" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
            className="text-h1 mt-8 text-maranasi-cream"
          >
            {t.login.welcome}
          </motion.h1>

          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.35 }}
            onSubmit={onSubmit}
            className="mt-10 space-y-3"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.login.emailPlaceholder}
              autoComplete="email"
              className="field border-transparent bg-white/10 text-maranasi-cream placeholder:text-maranasi-cream/50 focus:border-maranasi-gold"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.login.passwordPlaceholder}
              autoComplete="current-password"
              className="field border-transparent bg-white/10 text-maranasi-cream placeholder:text-maranasi-cream/50 focus:border-maranasi-gold"
              required
            />

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-small text-maranasi-champagne"
                >
                  {t.login.invalid}
                </motion.p>
              )}
            </AnimatePresence>

            <button type="submit" disabled={submitting || entering} className="btn btn-gold mt-2 w-full">
              {submitting || entering ? `${t.login.entering}…` : t.login.enterHub}
            </button>
          </motion.form>
        </div>
      </div>

      {/* Fade-to-white hand-off overlay */}
      <AnimatePresence>
        {entering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: EASE }}
            className="fixed inset-0 z-50 bg-maranasi-bone"
          />
        )}
      </AnimatePresence>
    </main>
  );
}
