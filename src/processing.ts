import { analyze } from "@/analyzer";
import type { Item, Source } from "@/domain/item";
import { supabaseAdmin } from "@/lib/supabase";
import type { Reader } from "@/readers/types";
import { readX } from "@/readers/x";

const READERS: Partial<Record<Source, Reader>> = {
  x: readX,
};

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
 * Reads the Item from its Source and writes its Summary. On any failure the Item becomes Failed
 * with the error text and one more attempt counted, so the daily retry can pick it up.
 */
export async function processItem(id: string): Promise<void> {
  const item = await loadItem(id);
  try {
    const reader = READERS[item.source];
    if (!reader) throw new Error(`No reader for source ${item.source}`);
    const summary = await analyze(await reader(item));
    await updateItem(id, { status: "done", error: null, ...summary });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    await updateItem(id, { status: "failed", attempts: item.attempts + 1, error: message });
  }
}
