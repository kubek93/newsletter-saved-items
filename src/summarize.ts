import { analyze } from "@/analyzer";
import type { Item, Source } from "@/domain/item";
import { supabaseAdmin } from "@/lib/supabase";
import type { Reader } from "@/readers/types";
import { readWeb } from "@/readers/web";
import { readX } from "@/readers/x";

const READERS: Partial<Record<Source, Reader>> = {
  x: readX,
  web: readWeb,
};

/** Whether Items from this Source can be read at all yet. */
export function hasReader(source: Source): boolean {
  return source in READERS;
}

async function loadItem(id: string): Promise<Item> {
  const { data, error } = await supabaseAdmin.from("items").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Item;
}

async function updateItem(id: string, patch: Partial<Item>) {
  const { error } = await supabaseAdmin.from("items").update(patch).eq("id", id);
  if (error) throw error;
}

/**
 * Reads the Item from its Source and writes its Summary, so the Item is done. On any failure the Item
 * becomes Failed with the error text and one more attempt counted, so the daily retry can pick it up.
 * A Source without a reader yet is left Pending untouched: missing code is not a failed attempt.
 */
export async function summarizeItem(id: string): Promise<void> {
  const item = await loadItem(id);
  const reader = READERS[item.source];
  if (!reader) return;

  try {
    const summary = await analyze(await reader(item));
    await updateItem(id, { status: "done", error: null, ...summary });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    await updateItem(id, { status: "failed", attempts: item.attempts + 1, error: message });
  }
}
