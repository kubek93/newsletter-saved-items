import { isCategory, type Category } from "@/domain/category";
import { isDigestDay } from "@/domain/digest-day";
import type { Item } from "@/domain/item";
import { isVideoMimeType } from "@/domain/upload-item";
import { supabaseAdmin } from "@/lib/supabase";
import { signedUploadUrl, uploadsBucket } from "@/lib/uploads";

/** What the Item list can be narrowed to. Dates are Digest Days (YYYY-MM-DD), inclusive. */
export type ItemFilters = { category?: Category; from?: string; to?: string };

/** Filters out of the page's query string; anything malformed is ignored rather than refused. */
export function parseFilters(params: Record<string, string | string[] | undefined>): ItemFilters {
  const single = (key: string) => (Array.isArray(params[key]) ? params[key][0] : params[key]);
  const category = single("category");
  const from = single("from");
  const to = single("to");
  return {
    category: isCategory(category) ? category : undefined,
    from: isDigestDay(from) ? from : undefined,
    to: isDigestDay(to) ? to : undefined,
  };
}

/** Every Item matching the filters, newest first. */
export async function listItems(filters: ItemFilters): Promise<Item[]> {
  let query = supabaseAdmin.from("items").select("*").order("saved_at", { ascending: false });
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.from) query = query.gte("digest_day", filters.from);
  if (filters.to) query = query.lte("digest_day", filters.to);
  const { data, error } = await query;
  if (error) throw error;
  return data as Item[];
}

export async function loadItem(id: string): Promise<Item | null> {
  const { data, error } = await supabaseAdmin.from("items").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Item | null;
}

export type Media = { kind: "image" | "video"; url: string };

/** For an Upload: a short-lived signed URL to show the file in the Panel. Null for link Items. */
export async function mediaFor(item: Item): Promise<Media | null> {
  if (item.source !== "upload" || !item.storage_path) return null;
  return { kind: isVideoMimeType(item.mime_type ?? "") ? "video" : "image", url: await signedUploadUrl(item.storage_path) };
}

/** The Owner overrides the model's pick. False when there is no such Item. */
export async function changeCategory(id: string, category: Category): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from("items").update({ category }).eq("id", id).select("id");
  if (error) throw error;
  return data.length === 1;
}

/**
 * Puts the Item back to Pending so the Summary can be written again on the Owner's request.
 * A done Item is otherwise never re-summarised, and the daily retry stops after three attempts.
 */
export async function reopenItem(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("items").update({ status: "pending", error: null }).eq("id", id);
  if (error) throw error;
}

/** Removes the Item for good, together with its file when it is an Upload. */
export async function deleteItem(item: Item): Promise<void> {
  if (item.source === "upload" && item.storage_path) {
    const { error } = await uploadsBucket().remove([item.storage_path]);
    if (error) throw new Error(`Storage delete failed: ${error.message}`);
  }
  const { error } = await supabaseAdmin.from("items").delete().eq("id", item.id);
  if (error) throw error;
}
