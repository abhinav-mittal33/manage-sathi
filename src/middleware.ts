import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = [
  '/login',
  '/api/v1/auth',
  '/api/v1/webhooks',
  '/progress',
];

if (!process.env.AUTH_SECRET) {
  throw new Error('AUTH_SECRET environment variable is not set. Generate one with: openssl rand -hex 32');
}
const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? 'ms_session';

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.sub ?? '');
    response.headers.set('x-firm-id', (payload.firmId as string) ?? '');
    response.headers.set('x-user-role', (payload.role as string) ?? '');
    return response;
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Session expired' } },
        { status: 401 }
      );
    }
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)'],
};
