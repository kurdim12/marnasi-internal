import Link from 'next/link';

// Marketing-free landing — quietly routes to the right place.
export default function RootPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="font-serif text-4xl text-emerald-900">Maranasi</h1>
      <p className="text-sm text-ink-950/60">
        مساحة العمل الداخلية · Internal workspace
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/login" className="btn btn-primary">دخول · Sign in</Link>
        <Link href="/report" className="btn btn-ghost">بلاغ مجهول · Report</Link>
      </div>
    </main>
  );
}
