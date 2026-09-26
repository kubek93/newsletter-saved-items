import type { Category } from "@/domain/category";
import type { Item } from "@/domain/item";
import { isVideoMimeType } from "@/domain/upload-item";
import { supabaseAdmin } from "@/lib/supabase";
import { uploadsBucket } from "@/lib/uploads";

const PREVIEW_URL_SECONDS = 60 * 60;

export async function loadItem(id: string): Promise<Item | null> {
  const { data, error } = await supabaseAdmin.from("items").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Item | null;
}

export type Media = { kind: "image" | "video"; url: string };

/** For an Upload: a short-lived signed URL to show the file in the Panel. Null for link Items. */
export async function mediaFor(item: Item): Promise<Media | null> {
  if (item.source !== "upload" || !item.storage_path) return null;
  const { data, error } = await uploadsBucket().createSignedUrl(item.storage_path, PREVIEW_URL_SECONDS);
  if (error) throw new Error(`Storage signed URL failed: ${error.message}`);
  return { kind: isVideoMimeType(item.mime_type ?? "") ? "video" : "image", url: data.signedUrl };
}

/** The Owner overrides the model's pick. */
export async function changeCategory(id: string, category: Category): Promise<void> {
  const { error } = await supabaseAdmin.from("items").update({ category }).eq("id", id);
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
