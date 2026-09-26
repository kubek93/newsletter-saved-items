import type { NextRequest } from "next/server";
import { accessOf, supabaseForRoute } from "@/panel/auth";
import { loginPath } from "@/panel/owner";

/** Where Google sends the browser back: turn the code into a session, then let only the Owner through. */
export async function GET(request: NextRequest) {
  const { supabase, redirectTo } = supabaseForRoute(request);
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return redirectTo(loginPath("error"));

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return redirectTo(loginPath("error"));

  if ((await accessOf(supabase)).access !== "owner") {
    await supabase.auth.signOut();
    return redirectTo(loginPath("refused"));
  }
  return redirectTo("/");
}
