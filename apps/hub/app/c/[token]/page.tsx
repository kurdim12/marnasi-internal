import { notFound } from 'next/navigation';
import { eventForToken, staff, clients } from '@/lib/seed';
import { eventDateFromOffset } from '@/lib/utils';
import { ClientPortal } from './ClientPortal';

export const runtime = 'edge';

// Public route (magic-link). No staff auth — access is by unguessable token.
export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const event = eventForToken(token);
  if (!event) notFound();

  const producer = staff.find((s) => s.fullName === event.producerName);
  const client = event.clientId ? clients.find((c) => c.id === event.clientId) : undefined;

  return (
    <ClientPortal
      event={event}
      targetIso={eventDateFromOffset(event.daysFromNow).toISOString()}
      producerName={event.producerName}
      producerPhone={producer?.phone}
      producerColor={producer?.avatarColor ?? '#0B3D2E'}
      clientName={client?.fullName ?? ''}
    />
  );
}
