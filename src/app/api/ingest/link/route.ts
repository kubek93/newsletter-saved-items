import { digestDayFor } from "@/domain/digest-day";
import { detectSource } from "@/domain/source";
import { normalizeUrl } from "@/domain/url";
import { isAuthorized } from "@/lib/ingest-auth";
import { supabaseAdmin } from "@/lib/supabase";

const UNIQUE_VIOLATION = "23505";

async function readUrl(request: Request): Promise<string | null> {
  try {
    const body: unknown = await request.json();
    const url = (body as { url?: unknown })?.url;
    return typeof url === "string" ? url : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = await readUrl(request);
  let normalizedUrl: string;
  try {
    if (url === null) throw new Error("missing url");
    normalizedUrl = normalizeUrl(url);
  } catch {
    return Response.json({ error: "invalid url" }, { status: 400 });
  }

  const savedAt = new Date();
  const inserted = await supabaseAdmin
    .from("items")
    .insert({
      source: detectSource(normalizedUrl),
      url,
      normalized_url: normalizedUrl,
      saved_at: savedAt.toISOString(),
      digest_day: digestDayFor(savedAt),
    })
    .select("id")
    .single();

  if (!inserted.error) {
    return Response.json({ status: "created", id: inserted.data.id }, { status: 201 });
  }
  if (inserted.error.code !== UNIQUE_VIOLATION) {
    throw inserted.error;
  }

  const existing = await supabaseAdmin
    .from("items")
    .select("id")
    .eq("normalized_url", normalizedUrl)
    .single();
  if (existing.error) throw existing.error;
  return Response.json({ status: "duplicate", id: existing.data.id }, { status: 200 });
}
