import './globals.css';
import type { Metadata } from 'next';
import { Inter, Noto_Sans_Arabic } from 'next/font/google';
import { I18nProvider } from '@/lib/i18n';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const arabic = Noto_Sans_Arabic({ subsets: ['arabic'], variable: '--font-arabic', display: 'swap' });

export const metadata: Metadata = {
  title: 'Maranasi Intranet',
  description: 'Internal workspace for Maranasi Events',
  robots: { index: false, follow: false },
};

export const runtime = 'edge';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // SSR-safe default: Arabic. The I18nProvider rehydrates from localStorage
  // on mount and flips html.dir if the user previously chose English.
  return (
    <html lang="ar" dir="rtl" className={`${inter.variable} ${arabic.variable}`}>
      <body>
        <I18nProvider initialLocale="ar">{children}</I18nProvider>
      </body>
    </html>
  );
}
