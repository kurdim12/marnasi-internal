import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/c'];

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api/') ||
    path.endsWith('.ico') ||
    PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'))
  ) {
    return NextResponse.next();
  }
  // Presence check only; the authoritative HMAC verification happens in
  // getSessionUser() on the server. This just keeps unauthenticated users
  // out of the app shell for a clean UX.
  const token = req.cookies.get('hub_session');
  if (!token) return NextResponse.redirect(new URL('/login', req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
