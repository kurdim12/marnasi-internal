import './globals.css';
import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter, Cairo, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { I18nProvider } from '@/lib/i18n';

const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-cormorant', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo', display: 'swap' });
const plexArabic = IBM_Plex_Sans_Arabic({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600'], variable: '--font-plex-arabic', display: 'swap' });

export const metadata: Metadata = {
  title: 'Maranasi Hub',
  description: 'The operating system for luxury event production.',
  robots: { index: false, follow: false },
};

export const runtime = 'edge';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Default English per NEXT_PUBLIC_DEFAULT_LANG; the provider rehydrates the
  // user's stored choice on mount and flips html.dir for Arabic (RTL).
  const fontVars = `${cormorant.variable} ${inter.variable} ${cairo.variable} ${plexArabic.variable}`;
  return (
    <html lang="en" dir="ltr" className={fontVars}>
      <body>
        <I18nProvider initialLocale="en">{children}</I18nProvider>
      </body>
    </html>
  );
}
