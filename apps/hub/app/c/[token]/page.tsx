import { notFound } from 'next/navigation';
import { getPortal } from '@/lib/db';
import { ClientPortal } from './ClientPortal';

export const runtime = 'edge';

// Public route (magic-link). No staff auth — access is by unguessable token.
export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const portal = await getPortal(token);
  if (!portal) notFound();

  return (
    <ClientPortal
      event={portal.event}
      targetIso={new Date(Date.now() + portal.event.daysFromNow * 86400000).toISOString()}
      producerName={portal.producerName}
      producerPhone={portal.producerPhone}
      producerColor={portal.producerColor}
      clientName={portal.clientName}
    />
  );
}
