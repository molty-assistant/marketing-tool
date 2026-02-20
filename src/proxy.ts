import { NextRequest, NextResponse } from 'next/server';

function isAuthEnabled(raw: string | undefined): boolean {
  if (!raw) return false;
  const value = raw.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

export function proxy(request: NextRequest) {
  // Skip auth for shared plan routes and healthcheck
  if (
    request.nextUrl.pathname.startsWith('/shared/') ||
    request.nextUrl.pathname.startsWith('/api/shared/') ||
    request.nextUrl.pathname === '/api/health'
  ) {
    return NextResponse.next();
  }

  // API key auth for automation (crons, scripts)
  const apiKey = process.env.API_KEY;
  if (apiKey) {
    const headerKey = request.headers.get('x-api-key');
    const queryKey = request.nextUrl.searchParams.get('api_key');
    if (headerKey === apiKey || queryKey === apiKey) {
      return NextResponse.next();
    }
  }

  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;
  const authEnabled = isAuthEnabled(process.env.BASIC_AUTH_ENABLED);

  // Basic auth is opt-in. Keep app public by default unless explicitly enabled.
  if (!authEnabled || !user || !pass) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = atob(encoded);
      const [authUser, authPass] = decoded.split(':');
      if (authUser === user && authPass === pass) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Marketing Tool"',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
