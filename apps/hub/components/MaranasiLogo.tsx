import { cn } from '@/lib/utils';

/*
  Wordmark logo. The brief references public/images/maranasi-logo.svg; until the
  real asset is dropped in, this renders the name in the brand serif so there is
  never a broken/missing image (acceptance criterion: no 404s on assets).
*/
export function MaranasiLogo({ className, tone = 'emerald' }: { className?: string; tone?: 'emerald' | 'cream' }) {
  const color = tone === 'cream' ? 'text-maranasi-cream' : 'text-maranasi-emerald';
  return (
    <span className={cn('font-display inline-flex items-baseline gap-[0.18em] leading-none tracking-tight', color, className)}>
      <span className="inline-block h-[0.42em] w-[0.42em] translate-y-[-0.08em] rounded-full bg-maranasi-gold" aria-hidden />
      <span>Maranasi</span>
    </span>
  );
}
