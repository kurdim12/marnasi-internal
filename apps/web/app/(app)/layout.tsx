import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { AppNav } from '@/components/AppNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // The middleware does deeper auth — here we just bounce if there's no access cookie at all.
  const jar = await cookies();
  if (!jar.get('mi_at')) redirect('/login');
  return (
    <div className="min-h-screen md:flex">
      <AppNav />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
    </div>
  );
}

export const dynamic = 'force-dynamic';
