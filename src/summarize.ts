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

/**
 * Takes the Item for one attempt: counts it in `attempts` and puts the Item back to Pending. The compare on
 * the previous count makes two concurrent runs (a doubled cron invocation) agree on who has it.
 */
async function claimAttempt(item: Item): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("items")
    .update({ status: "pending", attempts: item.attempts + 1 })
    .eq("id", item.id)
    .eq("attempts", item.attempts)
    .neq("status", "done")
    .select("id");
  if (error) throw error;
  return data.length === 1;
}

async function updateItem(id: string, patch: Partial<Item>) {
  const { error } = await supabaseAdmin.from("items").update(patch).eq("id", id);
  if (error) throw error;
}

/**
 * Reads the Item from its Source and writes its Summary, so the Item is done. `attempts` counts every attempt
 * started, so an attempt cut short (a timed-out invocation) still counts; on failure the Item becomes Failed
 * with the error text, and the daily retry stops after three attempts in total.
 */
export async function summarizeItem(id: string): Promise<void> {
  const item = await loadItem(id);
  if (!(await claimAttempt(item))) return;

  try {
    const summary = await analyze(await READERS[item.source](item));
    await updateItem(id, { status: "done", error: null, ...summary });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    await updateItem(id, { status: "failed", error: message });
  }
}
