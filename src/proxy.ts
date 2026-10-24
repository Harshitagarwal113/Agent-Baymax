import { NextResponse, NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { checkRateLimit, standardRateLimiter } from '@/lib/ratelimit';

const AI_API_ROUTES = ['/api/chat'];

export default async function proxy(request: NextRequest) {
  // 1. Authentication (Supabase)
  const authResponse = await updateSession(request);

  // 2. API Protection & Rate Limiting Architecture (Edge)
  if (AI_API_ROUTES.some(route => request.nextUrl.pathname.startsWith(route))) {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
    const isAllowed = await checkRateLimit(`ratelimit_${ip}`, standardRateLimiter);
    
    if (!isAllowed) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }

  return authResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files, sw.js, favicon, robots, and images
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|robots.txt|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
