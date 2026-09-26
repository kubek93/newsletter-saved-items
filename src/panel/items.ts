import { isCategory, type Category } from "@/domain/category";
import { isDigestDay } from "@/domain/digest-day";
import type { Item } from "@/domain/item";
import { supabaseAdmin } from "@/lib/supabase";

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
