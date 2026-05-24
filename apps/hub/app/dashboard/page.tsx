import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { Dashboard } from './_components/Dashboard';

export const runtime = 'edge';

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return <Dashboard userName={user.fullName} avatarColor={user.avatarColor} />;
}
