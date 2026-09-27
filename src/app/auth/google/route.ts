import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { supabaseForRoute } from "@/panel/auth";
import { loginPath } from "@/panel/owner";

/** Starts the Google sign-in: Supabase builds the provider URL, the browser is sent there. Not linked from the page until the provider is enabled. */
export async function POST(request: NextRequest) {
  const { supabase, redirectTo } = supabaseForRoute(request);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${env.panelUrl}/auth/callback` },
  });
  if (error || !data.url) return redirectTo(loginPath("error"));
  return redirectTo(data.url);
}
