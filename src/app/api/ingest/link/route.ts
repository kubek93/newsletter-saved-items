import { newLinkItem } from "@/domain/link-item";
import { firstUrl } from "@/domain/url";
import { afterResponse } from "@/lib/after-response";
import { isAuthorized } from "@/lib/ingest-auth";
import { readJson } from "@/lib/read-json";
import { supabaseAdmin } from "@/lib/supabase";
import { summarizeItem } from "@/summarize";

const UNIQUE_VIOLATION = "23505";

/** The Summary is written after the response, in the same invocation; an Apify run alone can take a minute. */
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await readJson<{ url?: unknown }>(request);
  const url = firstUrl(body?.url);
  if (url === null) {
    return Response.json({ error: "missing url" }, { status: 400 });
  }
  let row: ReturnType<typeof newLinkItem>;
  try {
    row = newLinkItem(url);
  } catch {
    return Response.json({ error: "invalid url" }, { status: 400 });
  }

  const inserted = await supabaseAdmin.from("items").insert(row).select("id").single();

  if (!inserted.error) {
    const id: string = inserted.data.id;
    afterResponse(() => summarizeItem(id));
    return Response.json({ status: "created", id }, { status: 201 });
  }
  if (inserted.error.code !== UNIQUE_VIOLATION) {
    throw inserted.error;
  }

  const existing = await supabaseAdmin
    .from("items")
    .select("id")
    .eq("normalized_url", row.normalized_url)
    .single();
  if (existing.error) throw existing.error;
  return Response.json({ status: "duplicate", id: existing.data.id }, { status: 200 });
}
