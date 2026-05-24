'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, MessageCircle, Copy, ExternalLink, Check } from 'lucide-react';
import { useI18n, interpolate } from '@/lib/i18n';
import { cn, formatJod, localizedNumber } from '@/lib/utils';
import { ProgressRing } from '@/components/ProgressRing';
import { MaranasiLogo } from '@/components/MaranasiLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import type { ActiveEvent } from '@/lib/types';
import type { DerivedTask, DerivedVendor, DerivedBudget, TaskStatus, EventVendorStatus } from '@/lib/eventDetail';

const EASE = [0.16, 1, 0.3, 1] as const;
const TABS = ['overview', 'timeline', 'vendors', 'budget', 'files', 'portal'] as const;
type Tab = (typeof TABS)[number];

function taskDot(status: TaskStatus): string {
  return status === 'completed' ? 'bg-maranasi-success'
    : status === 'in_progress' ? 'bg-maranasi-gold'
    : status === 'blocked' ? 'bg-maranasi-danger'
    : 'bg-maranasi-stone-soft';
}
function vendorPill(status: EventVendorStatus): string {
  return status === 'paid' || status === 'completed' ? 'bg-maranasi-success/15 text-maranasi-success'
    : status === 'confirmed' ? 'bg-maranasi-emerald/10 text-maranasi-emerald'
    : status === 'contacted' ? 'bg-maranasi-gold/20 text-maranasi-emerald-deep'
    : 'bg-maranasi-stone/12 text-maranasi-stone';
}

export function EventDetail({
  event, tasks, vendors, budget, portalToken,
}: {
  event: ActiveEvent;
  tasks: DerivedTask[];
  vendors: DerivedVendor[];
  budget: DerivedBudget;
  portalToken?: string;
}) {
  const { t, locale, dir } = useI18n();
  const [tab, setTab] = useState<Tab>('overview');
  const [copied, setCopied] = useState(false);

  const ov = t.eventDetail.overview;
  const dateFmt = (iso: string) =>
    new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en', { day: 'numeric', month: 'short' }).format(new Date(iso));

  function countdown(): string {
    if (event.daysFromNow < 0) return ov.completed;
    if (event.daysFromNow === 0) return ov.today;
    if (event.daysFromNow === 1) return ov.tomorrow;
    return interpolate(ov.daysToGo, { count: localizedNumber(event.daysFromNow, locale) });
  }
  function waLink(phone?: string): string | undefined {
    const n = (phone ?? '').replace(/[^0-9]/g, '');
    return n ? `https://wa.me/${n}` : undefined;
  }
  async function copyPortal() {
    if (!portalToken) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/c/${portalToken}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  const taskPctNum = Math.round((event.tasksComplete / event.tasksTotal) * 100);
  const recent = tasks.filter((t) => t.status === 'completed').slice(-4).reverse();

  return (
    <div dir={dir} className="min-h-dvh bg-maranasi-bone">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
        <header className="flex items-center justify-between">
          <Link href="/dashboard" className="text-tiny inline-flex items-center gap-1.5 text-maranasi-stone transition-colors hover:text-maranasi-emerald">
            <ArrowLeft size={14} className="rtl:hidden" /><ArrowRight size={14} className="hidden rtl:inline" />
            {t.eventDetail.back}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <MaranasiLogo className="text-base" />
          </div>
        </header>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
          className="relative mt-6 overflow-hidden rounded-card p-7 text-maranasi-cream md:p-9"
          style={{ background: `linear-gradient(135deg, ${event.gradient[0]}, ${event.gradient[1]})` }}
        >
          <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(70% 60% at 85% 0%, rgba(201,169,97,0.2), transparent 60%)' }} />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-tiny rounded-btn bg-white/15 px-2 py-1">{t.eventDetail.status[event.status]}</span>
              <h1 className="font-display mt-3 text-4xl md:text-5xl">{event.name}</h1>
              <p className="text-body mt-2 text-maranasi-cream/85">{event.venue}</p>
            </div>
            <div className="text-end">
              <p className="font-display text-3xl">{countdown()}</p>
              <p className="text-small text-maranasi-cream/75">{interpolate(t.events.guests, { count: localizedNumber(event.guestCount, locale) })}</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-maranasi-line no-scrollbar">
          {TABS.map((tb) => (
            <button
              key={tb}
              type="button"
              onClick={() => setTab(tb)}
              className={cn(
                'relative shrink-0 px-4 py-3 text-small transition-colors',
                tab === tb ? 'text-maranasi-emerald' : 'text-maranasi-stone hover:text-maranasi-emerald',
              )}
            >
              {t.eventDetail.tabs[tb]}
              {tab === tb && <motion.span layoutId="tab-underline" className="absolute inset-x-3 -bottom-px h-0.5 bg-maranasi-gold" />}
            </button>
          ))}
        </nav>

        <div className="mt-6">
          {tab === 'overview' && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="surface p-5">
                <p className="text-tiny text-maranasi-stone">{ov.producer}</p>
                <p className="text-body mt-1 font-medium text-maranasi-ink">{event.producerName}</p>
                <div className="mt-4 border-t border-maranasi-line pt-4">
                  <p className="text-tiny text-maranasi-stone">{ov.tier}</p>
                  <p className="text-body mt-1 text-maranasi-ink">{t.tiers[event.tier]}</p>
                </div>
                <div className="mt-4 border-t border-maranasi-line pt-4">
                  <p className="text-tiny text-maranasi-stone">{ov.budget}</p>
                  <p className="text-body numeral mt-1 text-maranasi-ink">{formatJod(event.totalBudgetJod, locale)} {t.common.jod}</p>
                </div>
              </div>

              <div className="surface flex flex-col items-center justify-center p-5">
                <ProgressRing value={taskPctNum} size={108} stroke={6} trackClassName="text-maranasi-line" barClassName="text-maranasi-gold">
                  <span className="numeral font-display text-2xl text-maranasi-emerald">{localizedNumber(taskPctNum, locale)}%</span>
                </ProgressRing>
                <p className="text-tiny mt-3 text-maranasi-stone">{ov.tasks}</p>
                <p className="text-small numeral text-maranasi-ink">{localizedNumber(event.tasksComplete, locale)} / {localizedNumber(event.tasksTotal, locale)}</p>
              </div>

              <div className="surface p-5">
                <p className="text-tiny text-maranasi-stone">{ov.recentActivity}</p>
                <ul className="mt-3 space-y-3">
                  {recent.map((task, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-maranasi-success" />
                      <span className="text-small text-maranasi-ink/80">{locale === 'ar' ? task.ar : task.en}</span>
                      <span className="text-tiny numeral ms-auto text-maranasi-stone">{dateFmt(task.dueIso)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {tab === 'timeline' && (
            <ol className="space-y-2">
              {tasks.map((task, i) => (
                <li key={i} className="surface flex items-center gap-4 p-4">
                  <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', taskDot(task.status))} />
                  <span className="text-body text-maranasi-ink">{locale === 'ar' ? task.ar : task.en}</span>
                  <span className="text-tiny ms-auto text-maranasi-stone">{t.eventDetail.timeline.taskStatus[task.status]}</span>
                  <span className="text-tiny numeral w-16 text-end text-maranasi-stone">{dateFmt(task.dueIso)}</span>
                </li>
              ))}
            </ol>
          )}

          {tab === 'vendors' && (
            <div className="grid gap-3 md:grid-cols-2">
              {vendors.map(({ vendor, status, agreedCostJod }) => {
                const wa = waLink(vendor.whatsappNumber ?? vendor.phone);
                return (
                  <div key={vendor.id} className="surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-body font-medium text-maranasi-ink">{vendor.name}</p>
                        <p className="text-tiny text-maranasi-stone">{t.vendorCategories[vendor.category]}</p>
                      </div>
                      <span className={cn('chip', vendorPill(status))}>{t.eventDetail.vendors.status[status]}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-maranasi-line pt-3">
                      <span className="text-small numeral text-maranasi-ink/80">{formatJod(agreedCostJod, locale)} {t.common.jod}</span>
                      <span className="text-tiny numeral text-maranasi-gold-deep">★ {vendor.rating.toFixed(1)}</span>
                    </div>
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer" className="text-tiny mt-3 inline-flex items-center gap-1.5 text-maranasi-emerald transition-colors hover:text-maranasi-gold-deep">
                        <MessageCircle size={13} /> {t.eventDetail.vendors.message}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'budget' && (
            <div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { l: t.eventDetail.budget.invoiced, v: budget.invoiced },
                  { l: t.eventDetail.budget.paidToDate, v: budget.paidToDate },
                  { l: t.eventDetail.budget.outstanding, v: budget.outstanding },
                ].map((c) => (
                  <div key={c.l} className="surface p-4">
                    <p className="text-tiny text-maranasi-stone">{c.l}</p>
                    <p className="font-display numeral mt-1 text-2xl text-maranasi-emerald">{formatJod(c.v, locale)}</p>
                    <p className="text-tiny text-maranasi-stone">{t.common.jod}</p>
                  </div>
                ))}
              </div>
              <div className="surface mt-4 overflow-hidden p-0">
                {budget.lines.map(({ vendor, agreedCostJod, paidJod, status }, i) => (
                  <div key={vendor.id} className={cn('flex items-center justify-between gap-3 px-4 py-3', i > 0 && 'border-t border-maranasi-line')}>
                    <div className="min-w-0">
                      <p className="text-small font-medium text-maranasi-ink">{vendor.name}</p>
                      <p className="text-tiny text-maranasi-stone">{t.vendorCategories[vendor.category]}</p>
                    </div>
                    <div className="text-end">
                      <p className="text-small numeral text-maranasi-ink">{formatJod(agreedCostJod, locale)}</p>
                      <p className="text-tiny numeral text-maranasi-stone">{t.eventDetail.budget.paid}: {formatJod(paidJod, locale)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'files' && (
            <div className="surface flex flex-col items-center justify-center py-20 text-center">
              <p className="font-display text-2xl text-maranasi-emerald">{t.eventDetail.files.empty}</p>
            </div>
          )}

          {tab === 'portal' && (
            <div className="surface p-6">
              <p className="font-display text-xl text-maranasi-emerald">{t.eventDetail.portal.title}</p>
              <p className="text-small mt-1 text-maranasi-stone">{t.eventDetail.portal.description}</p>
              {portalToken ? (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <code className="text-small rounded-btn border border-maranasi-line bg-maranasi-bone px-3 py-2 text-maranasi-ink/80">/c/{portalToken}</code>
                  <a href={`/c/${portalToken}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary"><ExternalLink size={14} /> {t.eventDetail.portal.open}</a>
                  <button type="button" onClick={copyPortal} className="btn btn-ghost">
                    {copied ? <><Check size={14} /> {t.eventDetail.portal.copied}</> : <><Copy size={14} /> {t.eventDetail.portal.copy}</>}
                  </button>
                </div>
              ) : (
                <p className="text-small mt-5 text-maranasi-stone">{t.eventDetail.files.empty}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
