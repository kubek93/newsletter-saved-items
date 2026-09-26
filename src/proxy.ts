import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const OPEN_PATHS = ["/login", "/auth/"];

/**
 * Runs before every Panel page: refreshes the Supabase session cookies and sends anyone without a
 * session to sign-in. Whether the signed-in account is the Owner is decided by the page (`requireOwner`).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
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
  const { pathname } = request.nextUrl;
  if (!user && !OPEN_PATHS.some((open) => pathname.startsWith(open))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return response;
}

export const config = {
  // Everything except API routes (they have their own tokens) and static assets.
  matcher: ["/((?!api/|_next/|favicon.ico).*)"],
};
