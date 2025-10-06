import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Define protected routes
  const protectedPaths = ['/dashboard', '/chat'];
  const isProtectedRoute = protectedPaths.some(path => pathname.startsWith(path));
  
  if (isProtectedRoute) {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    
    if (!token) {
      // Redirect to signin page if not authenticated
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }
  
  return NextResponse.next();
}

// Only run middleware on protected routes
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/chat/:path*',
  ]
};
