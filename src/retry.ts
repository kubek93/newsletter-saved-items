import { supabaseAdmin } from "@/lib/supabase";
import { summarizeItem } from "@/summarize";

/** After this many attempts in total an Item stays Failed for good. */
const MAX_ATTEMPTS = 3;
/** A Pending Item older than this has lost its background task (a crashed or timed-out invocation). */
const STUCK_AFTER_MS = 60 * 60 * 1000;
/** Stop taking new Items when this much of the invocation's time is used; the rest waits for tomorrow. */
const TIME_BUDGET_MS = 240 * 1000;

/**
 * Re-runs the Summary for every Failed Item with attempts left and every Item stuck Pending with attempts
 * left. Each run picks up whatever still qualifies, oldest first, one Item at a time, within a time budget.
 */
export async function retryStuckItems(now = new Date()): Promise<{ retried: string[] }> {
  const stuckBefore = new Date(now.getTime() - STUCK_AFTER_MS).toISOString();
  const { data, error } = await supabaseAdmin
    .from("items")
    .select("id")
    .lt("attempts", MAX_ATTEMPTS)
    .or(`status.eq.failed,and(status.eq.pending,saved_at.lt.${stuckBefore})`)
    .order("saved_at");
  if (error) throw error;

  const deadline = Date.now() + TIME_BUDGET_MS;
  const retried: string[] = [];
  for (const { id } of data) {
    if (Date.now() > deadline) break;
    await summarizeItem(id);
    retried.push(id);
  }
  return { retried };
}
