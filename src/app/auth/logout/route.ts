import type { NextRequest } from "next/server";
import { supabaseForRoute } from "@/panel/auth";
import { loginPath } from "@/panel/owner";

export async function POST(request: NextRequest) {
  const { supabase, redirectTo } = supabaseForRoute(request);
  await supabase.auth.signOut();
  return redirectTo(loginPath());
}
