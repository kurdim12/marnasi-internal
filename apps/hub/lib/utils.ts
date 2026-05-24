import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Locale } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AMMAN_TZ = 'Asia/Amman';

/** Current hour (0-23) in Amman regardless of where the server/browser runs. */
export function ammanHour(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: AMMAN_TZ,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '0';
  // Intl can emit "24" at midnight in some engines; normalise to 0-23.
  return Number(hour) % 24;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export function timeOfDay(now: Date = new Date()): TimeOfDay {
  const h = ammanHour(now);
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  return 'evening';
}

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** Render a number in Arabic-Indic digits for Arabic UI copy. */
export function toArabicDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => ARABIC_DIGITS[Number(d)]!);
}

/** Locale-aware integer for inline copy (count chips, guest counts, days). */
export function localizedNumber(value: number, locale: Locale): string {
  return locale === 'ar' ? toArabicDigits(value) : String(value);
}

/** Thousands-separated JOD amount, e.g. "42,000". Digits stay LTR. */
export function formatJod(amount: number, locale: Locale): string {
  const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount);
  return locale === 'ar' ? toArabicDigits(grouped) : grouped;
}

/** First name only, for the personal greeting. */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export function eventDateFromOffset(daysFromNow: number, base: Date = new Date()): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + daysFromNow);
  return d;
}
