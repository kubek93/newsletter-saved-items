import { isCategory, type Category } from "@/domain/category";
import { isSource, type Item, type Source } from "@/domain/item";
import { isVideoMimeType } from "@/domain/upload-item";
import { supabaseAdmin } from "@/lib/supabase";
import { signedUploadUrl } from "@/lib/uploads";

/** What anyone may see: only Items whose Summary exists, and only the fields the page shows. */
export type PublicItem = Pick<Item, "id" | "source" | "url" | "title" | "description" | "recap" | "category" | "digest_day" | "saved_at">;

export type BrowseFilters = { category?: Category; source?: Source };

export function parseBrowseFilters(params: Record<string, string | string[] | undefined>): BrowseFilters {
  const single = (key: string) => (Array.isArray(params[key]) ? params[key][0] : params[key]);
  const category = single("category");
  const source = single("source");
  return { category: isCategory(category) ? category : undefined, source: isSource(source) ? source : undefined };
}

/** Every done Item, newest Digest Day first, newest save first within a day. */
export async function listPublicItems(): Promise<PublicItem[]> {
  const { data, error } = await supabaseAdmin
    .from("items")
    .select("id, source, url, title, description, recap, category, digest_day, saved_at")
    .eq("status", "done")
    .order("digest_day", { ascending: false })
    .order("saved_at", { ascending: false });
  if (error) throw error;
  return data as PublicItem[];
}

export type PublicMedia = { url: string; video: boolean };

/** One done Item for its public page, with a signed URL to its file when it is an Upload. Null otherwise. */
export async function loadPublicItem(id: string): Promise<{ item: PublicItem; media?: PublicMedia } | null> {
  const { data, error } = await supabaseAdmin
    .from("items")
    .select("id, source, url, title, description, recap, category, digest_day, saved_at, storage_path, mime_type")
    .eq("id", id)
    .eq("status", "done")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { storage_path, mime_type, ...item } = data as PublicItem & { storage_path: string | null; mime_type: string | null };
  if (item.source === "upload" && storage_path) {
    return { item, media: { url: await signedUploadUrl(storage_path), video: isVideoMimeType(mime_type ?? "") } };
  }
  return { item };
}

export function applyFilters(items: PublicItem[], filters: BrowseFilters): PublicItem[] {
  return items.filter(
    (item) => (!filters.category || item.category === filters.category) && (!filters.source || item.source === filters.source),
  );
}

const WORDS_PER_MINUTE = 200;

/** Minutes to read the Summary, never below one. */
export function readingMinutes(item: Pick<PublicItem, "description" | "recap">): number {
  const words = `${item.description ?? ""} ${item.recap ?? ""}`.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** Items in sections, one per Digest Day, in the order the Items came. */
export function groupByDigestDay<T extends { digest_day: string }>(items: T[]): { digestDay: string; items: T[] }[] {
  const sections: { digestDay: string; items: T[] }[] = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    if (last && last.digestDay === item.digest_day) last.items.push(item);
    else sections.push({ digestDay: item.digest_day, items: [item] });
  }
  return sections;
}

/** How many Items fall under each value of `key`. */
export function countBy<T, K extends string>(items: T[], key: (item: T) => K | null): Map<K, number> {
  const counts = new Map<K, number>();
  for (const item of items) {
    const value = key(item);
    if (value !== null) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}
