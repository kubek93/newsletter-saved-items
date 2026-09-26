import { newLinkItem } from "@/domain/link-item";
import { supabaseAdmin } from "@/lib/supabase";

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
  const { data, error } = await supabaseAdmin.from("items").insert(newLinkItem(url)).select("id").single();
  if (error) throw error;
  return data.id;
}

/** Resolves once every Item has left Pending, so a Summary still being written cannot leak into the next test. */
export async function waitUntilSummarized(timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const items = await allItems();
    if (items.every((item) => item.status !== "pending")) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Items still pending after timeout");
}
