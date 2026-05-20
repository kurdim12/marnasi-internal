'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { auth } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { LanguageToggle } from './LanguageToggle';

const items = [
  { href: '/chat', key: 'chat' },
  { href: '/reports', key: 'reports' },
  { href: '/docs', key: 'docs' },
  { href: '/hr', key: 'hr' },
  { href: '/settings', key: 'me' },
] as const;

export function AppNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  return (
    <>
      {/* Sidebar on desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-ink-950/10 bg-white p-5 md:flex md:flex-col">
        <Link href="/chat" className="mb-8 font-serif text-2xl text-emerald-900">Maranasi</Link>
        <nav className="flex flex-col gap-1">
          {items.map((it) => {
            const active = pathname.startsWith(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={
                  'rounded-xl px-3 py-2 text-sm transition ' +
                  (active ? 'bg-emerald-900 text-white' : 'text-ink-950/80 hover:bg-ivory-100')
                }
              >
                {t.nav[it.key]}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center justify-between pt-4 text-xs text-ink-950/60">
          <LanguageToggle />
          <button
            onClick={async () => { await auth.logout(); router.push('/login'); }}
            className="hover:underline"
          >
            {t.nav.signOut}
          </button>
        </div>
      </aside>

      {/* Bottom nav on mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-ink-950/10 bg-white py-2 md:hidden">
        {items.map((it) => {
          const active = pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={'flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] ' + (active ? 'text-emerald-900 font-medium' : 'text-ink-950/60')}
            >
              {t.nav[it.key]}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
