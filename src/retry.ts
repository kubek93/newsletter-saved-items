import { supabaseAdmin } from "@/lib/supabase";
import { summarizeItem } from "@/summarize";

/** After this many failed attempts an Item stays Failed for good. */
export const MAX_ATTEMPTS = 3;
/** A Pending Item older than this has lost its background task (a crashed or timed-out invocation). */
const STUCK_AFTER_MS = 60 * 60 * 1000;

/**
 * Re-runs the Summary for every Failed Item with attempts left and every Item stuck Pending.
 * Idempotent: each run picks up whatever still qualifies, one Item at a time.
 */
export async function retryStuckItems(now = new Date()): Promise<{ retried: string[] }> {
  const stuckBefore = new Date(now.getTime() - STUCK_AFTER_MS).toISOString();
  const { data, error } = await supabaseAdmin
    .from("items")
    .select("id")
    .or(`and(status.eq.failed,attempts.lt.${MAX_ATTEMPTS}),and(status.eq.pending,saved_at.lt.${stuckBefore})`)
    .order("saved_at");
  if (error) throw error;

  const retried: string[] = [];
  for (const { id } of data) {
    await summarizeItem(id);
    retried.push(id);
  }
  return { retried };
}
