import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Extract project ref from env to build the exact supabase auth cookie key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  const projectRef = supabaseUrl.includes('supabase.co') 
    ? supabaseUrl.split('//')[1].split('.')[0] 
    : 'placeholder';
  const cookieKey = `sb-${projectRef}-auth-token`;

  // Reconstruct cookie value in case it was chunked by Supabase client-side
  let rawToken = '';
  const chunk0 = request.cookies.get(`${cookieKey}.0`)?.value;
  if (chunk0) {
    let index = 0;
    while (index < 10) { // Limit to 10 chunks to prevent potential infinite loops
      const chunk = request.cookies.get(`${cookieKey}.${index}`)?.value;
      if (!chunk) break;
      rawToken += chunk;
      index++;
    }
  } else {
    rawToken = request.cookies.get(cookieKey)?.value || '';
  }

  // Parse access_token if the cookie holds a JSON-stringified session object
  let jwt = '';
  if (rawToken) {
    try {
      const decoded = decodeURIComponent(rawToken);
      if (decoded.startsWith('{')) {
        const session = JSON.parse(decoded);
        jwt = session.access_token || '';
      } else if (rawToken.startsWith('{')) {
        const session = JSON.parse(rawToken);
        jwt = session.access_token || '';
      } else {
        jwt = rawToken;
      }
    } catch (e) {
      jwt = rawToken;
    }
  }

  // Gate mock session to development environment only (M-4 / M-5)
  const isMock = jwt === 'mock-session';
  const isDev = process.env.NODE_ENV === 'development';
  
  let isAuthenticated = false;
  if (isMock && isDev) {
    isAuthenticated = true;
  } else if (jwt && !isMock) {
    try {
      // Validate the JWT cryptographically with Supabase Auth
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error } = await supabase.auth.getUser(jwt);
      if (user && !error) {
        isAuthenticated = true;
      }
    } catch (e) {
      console.error('Error validating JWT token in middleware:', e);
    }
  }

  // Protected dashboard & onboarding routes (L-6)
  const isDashboardRoute = pathname.startsWith('/dashboard') || 
                           pathname.startsWith('/plan') ||
                           pathname.startsWith('/transactions') ||
                           pathname.startsWith('/budget') ||
                           pathname.startsWith('/investments') ||
                           pathname.startsWith('/goals') ||
                           pathname.startsWith('/loans') ||
                           pathname.startsWith('/tax') ||
                           pathname.startsWith('/advisor') ||
                           pathname.startsWith('/settings') ||
                           pathname.startsWith('/reports') ||
                           pathname.startsWith('/onboarding'); // protects onboarding as well

  // Authentication screens
  const isAuthRoute = pathname.startsWith('/login') || 
                      pathname.startsWith('/signup') ||
                      pathname.startsWith('/reset-password');

  // 1. If trying to access dashboard/onboarding and not logged in, redirect to login
  if (isDashboardRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. If logged in and trying to access auth pages, redirect to dashboard
  if (isAuthRoute && isAuthenticated) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

// Next.js Route Matchers
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/plan/:path*',
    '/transactions/:path*',
    '/budget/:path*',
    '/investments/:path*',
    '/goals/:path*',
    '/loans/:path*',
    '/tax/:path*',
    '/advisor/:path*',
    '/settings/:path*',
    '/reports/:path*',
    '/onboarding/:path*',
    '/login',
    '/signup',
    '/reset-password'
  ],
};
