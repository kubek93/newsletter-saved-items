import type { Item } from "@/domain/item";
import { supabaseAdmin } from "./supabase";

export type ItemFile = { path: string; mime_type: string };

/** How long after its first file a share's Item still takes the next files of the same batch. */
const BATCH_WINDOW_MINUTES = 15;

/** The files of an Upload, in the order they were registered. */
export async function listItemFiles(item: Pick<Item, "id" | "storage_path" | "mime_type">): Promise<ItemFile[]> {
  const { data, error } = await supabaseAdmin.from("item_files").select("path, mime_type").eq("item_id", item.id).order("position");
  if (error) throw error;
  if (data.length > 0) return data as ItemFile[];
  // An Item written straight to the table (tests, or history before collections) has only its storage_path.
  return item.storage_path ? [{ path: item.storage_path, mime_type: item.mime_type ?? "" }] : [];
}

/** Appends a file to an Item's collection, after the ones already there. */
export async function addItemFile(itemId: string, file: ItemFile): Promise<void> {
  const { count, error: countError } = await supabaseAdmin
    .from("item_files")
    .select("*", { count: "exact", head: true })
    .eq("item_id", itemId);
  if (countError) throw countError;
  const { error } = await supabaseAdmin.from("item_files").insert({ item_id: itemId, position: count ?? 0, ...file });
  if (error) throw error;
}

/** The Pending Item a share with this batch key started within the window, or null when there is none. */
export async function openBatchItem(batch: string): Promise<string | null> {
  const since = new Date(Date.now() - BATCH_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("items")
    .select("id")
    .eq("batch", batch)
    .eq("source", "upload")
    .eq("status", "pending")
    .gte("saved_at", since)
    .order("saved_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}
