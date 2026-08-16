import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Refreshes the Supabase session cookie on every request that hits a page.
 * Server Components can't write cookies themselves (see the comment in
 * lib/supabase/server.ts), so without this, a session nearing expiry would
 * never get refreshed for a user who only ever loads server-rendered pages
 * — they'd eventually get silently signed out. This is the standard
 * @supabase/ssr middleware pattern; it doesn't do any route protection
 * itself (admin routes are still gated client-side by AdminAuthProvider).
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Touching auth.getUser() is what actually triggers the refresh-if-expired
  // logic and writes the updated cookie via setAll above. Do not swap this
  // for getSession() here — that reads the (possibly stale) local cookie
  // without validating/refreshing it against Supabase.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Skip static assets and image optimization files; run on everything else.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
