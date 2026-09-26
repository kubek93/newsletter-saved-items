import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

/** Server-side client with the service role: bypasses RLS, never exposed to the browser. */
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
