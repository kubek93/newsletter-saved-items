import { analyze } from "@/analyzer";
import type { Item, Source } from "@/domain/item";
import { supabaseAdmin } from "@/lib/supabase";
import { readInstagram } from "@/readers/instagram";
import type { Reader } from "@/readers/types";
import { readUpload } from "@/readers/upload";
import { readWeb } from "@/readers/web";
import { readX } from "@/readers/x";

const READERS: Record<Source, Reader> = {
  x: readX,
  instagram: readInstagram,
  web: readWeb,
  upload: readUpload,
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
 * Reads the Item from its Source and writes its Summary, so the Item is done. On any failure the Item
 * becomes Failed with the error text and one more attempt counted, so the daily retry can pick it up.
 */
export async function summarizeItem(id: string): Promise<void> {
  const item = await loadItem(id);
  try {
    const summary = await analyze(await READERS[item.source](item));
    await updateItem(id, { status: "done", error: null, ...summary });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    await updateItem(id, { status: "failed", attempts: item.attempts + 1, error: message });
  }
}
