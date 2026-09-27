import type { NextRequest } from "next/server";
import { accessOf, supabaseForRoute } from "@/panel/auth";
import { loginPath } from "@/panel/owner";

/** Email and password sign-in. The account must exist in Supabase Auth and be the Owner. */
export async function POST(request: NextRequest) {
  const { supabase, redirectTo } = supabaseForRoute(request);
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return redirectTo(loginPath("error"));

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return redirectTo(loginPath("error"));

  if ((await accessOf(supabase)).access !== "owner") {
    await supabase.auth.signOut();
    return redirectTo(loginPath("refused"));
  }
  return redirectTo("/");
}
