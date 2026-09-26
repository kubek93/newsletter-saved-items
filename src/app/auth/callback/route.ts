import { env } from "@/lib/env";
import { accessFor, supabaseForRequest } from "@/panel/auth";

/** Where Google sends the browser back: turn the code into a session, then let only the Owner through. */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) {
    return Response.redirect(`${env.panelUrl}/login?error=1`, 303);
  }

  const supabase = await supabaseForRequest();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return Response.redirect(`${env.panelUrl}/login?error=1`, 303);
  }
  if (accessFor(data.user) !== "owner") {
    await supabase.auth.signOut();
    return Response.redirect(`${env.panelUrl}/login?refused=1`, 303);
  }
  return Response.redirect(`${env.panelUrl}/`, 303);
}
