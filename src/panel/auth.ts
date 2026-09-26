import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { accessFor, loginPath, type Access } from "./owner";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/** Whether the account in this session may use the Panel. */
export async function accessOf(supabase: SupabaseClient): Promise<Access> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return accessFor(user, env.ownerEmail);
}

/** For Server Components: a Supabase Auth client on the request's cookies. Data access stays on the service role. */
export async function supabaseForPage(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // A Server Component cannot set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}

/**
 * For Route Handlers: a Supabase Auth client on the request's cookies, plus a redirect that carries
 * whatever cookies Auth set meanwhile (a new session, or a cleared one) back to the browser.
 */
export function supabaseForRoute(request: NextRequest) {
  const jar: CookieToSet[] = [];
  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        jar.push(...toSet);
      },
    },
  });
  const redirectTo = (path: string) => {
    const response = NextResponse.redirect(new URL(path, env.panelUrl), 303);
    for (const { name, value, options } of jar) response.cookies.set(name, value, options);
    return response;
  };
  return { supabase, redirectTo };
}

/**
 * For Route Handlers behind the Panel: the proxy already keeps strangers out, but a handler that changes
 * data checks for itself. Either a 401 to return, or a redirect helper for the happy path.
 */
export async function ownerOr401(
  request: NextRequest,
): Promise<{ refused: Response } | { refused?: undefined; redirectTo: (path: string) => NextResponse }> {
  // The session lives in a cookie, so a form posted from another site must not count. Browsers send
  // Origin on every POST; when it is there it has to be the Panel itself.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(env.panelUrl).origin) {
    return { refused: new Response("Forbidden", { status: 403 }) };
  }
  const { supabase, redirectTo } = supabaseForRoute(request);
  const access = await accessOf(supabase);
  if (access.access !== "owner") return { refused: new Response("Unauthorized", { status: 401 }) };
  return { redirectTo };
}

/** For Panel pages: the Owner's email, or a redirect to sign-in (with a refusal message for anyone else). */
export async function requireOwner(): Promise<string> {
  const supabase = await supabaseForPage();
  const access = await accessOf(supabase);
  if (access.access === "owner") return access.email;
  // The proxy has already signed a refused account out; this is the page's own guard.
  redirect(loginPath(access.access === "refused" ? "refused" : undefined));
}
