import { env } from "@/lib/env";
import { supabaseForRequest } from "@/panel/auth";

export async function POST() {
  const supabase = await supabaseForRequest();
  await supabase.auth.signOut();
  return Response.redirect(`${env.panelUrl}/login`, 303);
}
