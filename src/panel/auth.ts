import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";

/** True for the one Google account allowed into the Panel. Case and surrounding whitespace do not matter. */
export function isOwner(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase() === env.ownerEmail.trim().toLowerCase();
}

export type Access = "anonymous" | "refused" | "owner";

/** What a signed-in (or not) Google user may do in the Panel. */
export function accessFor(user: Pick<User, "email"> | null): Access {
  if (!user) return "anonymous";
  return isOwner(user.email) ? "owner" : "refused";
}

/** A Supabase client bound to the current request's cookies, for Auth only; data access stays on the service role. */
export async function supabaseForRequest(): Promise<SupabaseClient> {
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

/** For Panel pages: the Owner's email, or a redirect to sign-in (with a refusal message for anyone else). */
export async function requireOwner(): Promise<string> {
  const supabase = await supabaseForRequest();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const access = accessFor(user);
  if (access === "owner") return user!.email!;
  if (access === "refused") await supabase.auth.signOut();
  redirect(access === "refused" ? "/login?refused=1" : "/login");
}
