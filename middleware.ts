import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Protect sighting saves; everything else is public (identify works without sign-in)
const isProtected = createRouteMatcher(["/api/sighting(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
