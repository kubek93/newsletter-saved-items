import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { accessFor, loginPath } from "@/panel/owner";

/** The public page at the root, sign-in and the auth routes need no session. */
const OPEN_PATHS = ["/login", "/auth/"];
const isOpen = (pathname: string) => pathname === "/" || OPEN_PATHS.some((open) => pathname.startsWith(open));

/**
 * Runs before every Panel page: refreshes the Supabase session cookies, sends anyone without a session
 * to sign-in, and signs out any Google account that is not the Owner, with the refusal message.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  // The proxy is deployed on its own, so it reads its variables directly rather than pulling in
  // `@/lib/env`, which requires every variable of the whole application.
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const access = accessFor(user, process.env.OWNER_EMAIL!);
  const { pathname } = request.nextUrl;

  if (access.access === "refused") {
    await supabase.auth.signOut();
    const refused = NextResponse.redirect(new URL(loginPath("refused"), request.url));
    for (const cookie of response.cookies.getAll()) refused.cookies.set(cookie);
    return refused;
  }
  if (access.access === "anonymous" && !isOpen(pathname)) {
    return NextResponse.redirect(new URL(loginPath(), request.url));
  }
  return response;
}

export const config = {
  // Everything except API routes (they have their own tokens) and static assets.
  matcher: ["/((?!api/|_next/|favicon.ico).*)"],
};
