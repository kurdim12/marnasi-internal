/**
 * Cloudflare Turnstile verification.
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export async function verifyTurnstile(token: string | undefined, secret: string, remoteIp?: string): Promise<boolean> {
  if (!token) return false;
  // Test mode keys always pass — keep tests cheap
  if (secret === '1x0000000000000000000000000000000AA') return true;

  const body = new URLSearchParams();
  body.append('secret', secret);
  body.append('response', token);
  if (remoteIp) body.append('remoteip', remoteIp);

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
