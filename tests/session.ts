import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

type Cookie = { name: string; value: string };

/**
 * A signed-in browser for `email`, without Google: the account is created (or reused) through the Auth
 * admin API, a magic link is verified server-side, and the resulting session is written into the same
 * cookies `@supabase/ssr` would set in a real browser.
 */
export async function sessionCookiesFor(email: string): Promise<Cookie[]> {
  const created = await supabaseAdmin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error && !/already/i.test(created.error.message)) throw created.error;

  const link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw link.error;

  const cookies: Cookie[] = [];
  const browser = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookies,
      setAll: (toSet) => {
        for (const { name, value } of toSet) {
          const index = cookies.findIndex((cookie) => cookie.name === name);
          if (index >= 0) cookies[index] = { name, value };
          else cookies.push({ name, value });
        }
      },
    },
  });
  const verified = await browser.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: "magiclink" });
  if (verified.error) throw verified.error;
  return cookies.filter((cookie) => cookie.value !== "");
}

/** A request to the Panel as a browser with these cookies would make it. */
export function panelRequest(path: string, cookies: Cookie[] = [], init?: ConstructorParameters<typeof NextRequest>[1]): NextRequest {
  const request = new NextRequest(new URL(path, "http://localhost:3000"), init);
  for (const { name, value } of cookies) request.cookies.set(name, value);
  return request;
}

/** A submitted HTML form, as the browser posts it. */
export function formRequest(path: string, fields: Record<string, string>, cookies: Cookie[] = []): NextRequest {
  return panelRequest(path, cookies, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  });
}
