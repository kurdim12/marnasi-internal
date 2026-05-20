/**
 * MailChannels via Workers — free transactional email for Cloudflare customers.
 * Docs: https://developers.cloudflare.com/pages/functions/plugins/mailchannels/
 *
 * For production, configure SPF + DKIM on your sending domain.
 */
export interface SendMailParams {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
  from?: { email: string; name?: string };
  dkimDomain?: string;
  dkimSelector?: string;
  dkimPrivateKey?: string;
}

export async function sendMail(p: SendMailParams): Promise<void> {
  const from = p.from ?? { email: 'no-reply@maranasi-events.com', name: 'Maranasi Intranet' };
  const payload: Record<string, unknown> = {
    personalizations: [{ to: [{ email: p.to, name: p.toName }] }],
    from,
    subject: p.subject,
    content: [
      { type: 'text/plain', value: p.text },
      { type: 'text/html', value: p.html },
    ],
  };
  if (p.dkimDomain && p.dkimSelector && p.dkimPrivateKey) {
    (payload.personalizations as Array<Record<string, unknown>>)[0]!.dkim_domain = p.dkimDomain;
    (payload.personalizations as Array<Record<string, unknown>>)[0]!.dkim_selector = p.dkimSelector;
    (payload.personalizations as Array<Record<string, unknown>>)[0]!.dkim_private_key = p.dkimPrivateKey;
  }

  const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MailChannels send failed: ${res.status} ${body}`);
  }
}
