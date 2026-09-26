import { supabaseAdmin } from "@/lib/supabase";
import { digestDayFor } from "@/domain/digest-day";
import { normalizeUrl } from "@/domain/url";
import { detectSource } from "@/domain/source";

export async function clearItems() {
  const { error } = await supabaseAdmin.from("items").delete().not("id", "is", null);
  if (error) throw error;
}

export async function allItems() {
  const { data, error } = await supabaseAdmin.from("items").select("*").order("saved_at");
  if (error) throw error;
  return data;
}

export async function getItem(id: string) {
  const { data, error } = await supabaseAdmin.from("items").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

/** A Pending link Item written straight to the table, for tests that exercise the job rather than ingest. */
export async function insertPendingLink(url: string): Promise<string> {
  const normalizedUrl = normalizeUrl(url);
  const savedAt = new Date();
  const { data, error } = await supabaseAdmin
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
  if (error) throw error;
  return data.id;
}

/** Resolves once no Item is Pending any more, so background processing cannot leak into the next test. */
export async function waitUntilNothingPending(timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const items = await allItems();
    if (items.every((item) => item.status !== "pending")) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Items still pending after timeout");
}
