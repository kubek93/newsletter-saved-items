import { env } from "@/lib/env";
import { supabaseForRequest } from "@/panel/auth";

/** Starts the Google sign-in: Supabase builds the provider URL, the browser is sent there. */
export async function POST() {
  const supabase = await supabaseForRequest();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${env.panelUrl}/auth/callback` },
  });
  if (error || !data.url) {
    return Response.redirect(`${env.panelUrl}/login?error=1`, 303);
  }
  return Response.redirect(data.url, 303);
}
