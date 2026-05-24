import { notFound, redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { findActiveEvent, findPastEvent, tokenForEvent } from '@/lib/seed';
import { deriveTasks, deriveVendors, deriveBudget } from '@/lib/eventDetail';
import { EventDetail } from './EventDetail';
import { CaseStudy } from './CaseStudy';

export const runtime = 'edge';

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const { id } = await params;

  const active = findActiveEvent(id);
  if (active) {
    return (
      <EventDetail
        event={active}
        tasks={deriveTasks(active)}
        vendors={deriveVendors(active)}
        budget={deriveBudget(active)}
        portalToken={tokenForEvent(active.id)}
      />
    );
  }

  const past = findPastEvent(id);
  if (past) return <CaseStudy event={past} />;

  notFound();
}
