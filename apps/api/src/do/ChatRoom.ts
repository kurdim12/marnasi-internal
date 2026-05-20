import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types/env';

/**
 * ChatRoom Durable Object.
 *
 * One instance per room. Holds active WebSocket connections of members
 * currently viewing the room, and a presence map. Never sees message
 * content — all messages remain E2EE ciphertext.
 *
 * The Worker writes the (ciphertext, iv) row to D1 first, then calls
 * /broadcast on the DO with the new row's id, so subscribers can fetch +
 * decrypt.
 */
type Conn = { userId: string; ws: WebSocket };

interface BroadcastPayload {
  type: 'message.new' | 'message.edit' | 'message.delete' | 'presence' | 'typing';
  data: unknown;
}

export class ChatRoom extends DurableObject<Env> {
  private conns: Set<Conn> = new Set();

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/socket') {
      return this.handleSocket(req);
    }
    if (url.pathname === '/broadcast' && req.method === 'POST') {
      const body = await req.json<BroadcastPayload>();
      this.broadcast(body);
      return new Response('ok');
    }
    if (url.pathname === '/presence' && req.method === 'GET') {
      const userIds = [...new Set([...this.conns].map((c) => c.userId))];
      return Response.json({ online: userIds });
    }
    return new Response('not found', { status: 404 });
  }

  private async handleSocket(req: Request): Promise<Response> {
    const userId = req.headers.get('x-user-id');
    if (!userId) return new Response('missing user', { status: 400 });
    if (req.headers.get('upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    server.accept();
    const conn: Conn = { userId, ws: server };
    this.conns.add(conn);

    // Notify others of presence
    this.broadcast({ type: 'presence', data: { userId, status: 'online' } });

    server.addEventListener('message', (ev) => {
      // Clients can send typing indicators only (no content). Anything else is dropped.
      try {
        const msg = JSON.parse(String(ev.data)) as { type?: string };
        if (msg.type === 'typing') {
          this.broadcast({ type: 'typing', data: { userId } });
        }
      } catch {
        /* ignore malformed */
      }
    });

    const close = () => {
      this.conns.delete(conn);
      this.broadcast({ type: 'presence', data: { userId, status: 'offline' } });
    };
    server.addEventListener('close', close);
    server.addEventListener('error', close);

    return new Response(null, { status: 101, webSocket: client });
  }

  private broadcast(payload: BroadcastPayload): void {
    const json = JSON.stringify(payload);
    for (const c of this.conns) {
      try {
        c.ws.send(json);
      } catch {
        this.conns.delete(c);
      }
    }
  }
}
