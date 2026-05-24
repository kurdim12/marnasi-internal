'use client';

import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function LanguageToggle({ className, tone = 'emerald' }: { className?: string; tone?: 'emerald' | 'cream' }) {
  const { toggle, t } = useI18n();
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'text-tiny rounded-btn px-2.5 py-1 transition-colors',
        tone === 'cream'
          ? 'text-maranasi-cream/80 hover:bg-white/10 hover:text-maranasi-cream'
          : 'text-maranasi-stone hover:bg-maranasi-emerald/5 hover:text-maranasi-emerald',
        className,
      )}
      aria-label="Toggle language"
    >
      {t.common.switchLanguage}
    </button>
  );
}
