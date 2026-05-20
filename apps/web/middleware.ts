import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/signup', '/forgot-password', '/report', '/track'];

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
  const token = req.cookies.get('mi_at');
  if (!token) return NextResponse.redirect(new URL('/login', req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
