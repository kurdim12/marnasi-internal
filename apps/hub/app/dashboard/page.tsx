import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getLeads, getActiveEvents, getPastEvents } from '@/lib/db';
import { Dashboard } from './_components/Dashboard';

export const runtime = 'edge';

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const [leads, activeEvents, pastEvents] = await Promise.all([
    getLeads(),
    getActiveEvents(),
    getPastEvents(),
  ]);

  return (
    <Dashboard
      userName={user.fullName}
      avatarColor={user.avatarColor}
      leads={leads}
      activeEvents={activeEvents}
      pastEvents={pastEvents}
    />
  );
}
