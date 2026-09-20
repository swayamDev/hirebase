import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Resource-based auth (createRouteMatcher is deprecated): the middleware only
 * attaches Clerk's auth context. Every protected resource checks for itself -
 * dashboard pages/layout via requireOrg() (lib/tenant.ts), /onboarding inline,
 * /api/agent returns 401/403, and all Server Actions go through requireOrg +
 * assertOwned. Public by design: /, /sign-in, /sign-up, /api/webhooks (svix
 * verification), and /studio (Sanity's own login + project membership).
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static assets
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    // Clerk's same-origin JS-loading proxy (/__clerk/npm/...) ends in .js,
    // so the static-asset skip pattern above would otherwise exclude it -
    // the middleware never runs, Next.js has no real route there, and the
    // request 404s instead of being proxied to Clerk's CDN. Clerk's own
    // clerk-js then fails to load at all, breaking every sign-in page.
    "/__clerk/(.*)",
  ],
};
