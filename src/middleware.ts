import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define protected routes
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/forum(.*)",
  "/server(.*)",
  "/api/trpc(.*)",
]);

// Define public routes (routes that don't require authentication)
const isPublicRoute = createRouteMatcher([
  "/",
  "/invite(.*)", // Allow all invite routes to be public
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/trpc/server.getInvitePublic", // Allow public invite API
  "/api/trpc/server.getInvite", // Allow public invite API (backward compatibility)
]);

export default clerkMiddleware(async (auth, req) => {
  // Check if the route is explicitly public first
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }
  
  // Check if the route is protected
  if (isProtectedRoute(req)) {
    // Use auth().userId to check if user is authenticated
    const session = await auth();
    
    if (!session.userId) {
      // Redirect to sign-in if not authenticated
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
    }
    
    // Protect the route
    await auth.protect();
  }
  
  return NextResponse.next();
});

// Configure which routes should be processed by this middleware
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    // Always run for API routes
    "/api/trpc/:path*",
  ],
};
