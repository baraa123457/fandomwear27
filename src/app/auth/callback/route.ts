import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * OAuth Callback Route Handler
 *
 * After Google/Facebook redirects the user back to Supabase, Supabase
 * then redirects here with a `code` parameter (PKCE flow).
 * This route exchanges the code for a user session, sets the auth cookies,
 * then sends the user to their account page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  // Where to send the user after login (defaults to orders page)
  const next = searchParams.get("next") ?? "/account/orders";

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server Component context — safe to ignore
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect to account page after successful login
      return NextResponse.redirect(`${origin}${next}`);
    }

    // If something went wrong with the code exchange, redirect to login
    // with an error message
    return NextResponse.redirect(
      `${origin}/account/login?error=oauth_error&message=${encodeURIComponent(
        error.message
      )}`
    );
  }

  // No code present — redirect to login
  return NextResponse.redirect(`${origin}/account/login`);
}
