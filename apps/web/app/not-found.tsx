import Link from 'next/link';

export const runtime = 'edge';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-serif text-4xl text-emerald-900">404</h1>
      <p className="text-sm text-ink-950/60">Page not found · الصفحة غير موجودة</p>
      <Link href="/" className="btn btn-primary">Home</Link>
    </main>
  );
}
