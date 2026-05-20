'use client';
import { useI18n } from '@/lib/i18n';

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
      className="text-sm text-emerald-900 hover:underline"
      aria-label={t.common.language}
    >
      {locale === 'ar' ? t.common.english : t.common.arabic}
    </button>
  );
}
