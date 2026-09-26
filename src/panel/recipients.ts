import { isEmail, normalizeEmail, type Recipient } from "@/domain/recipient";
import { supabaseAdmin } from "@/lib/supabase";

const UNIQUE_VIOLATION = "23505";

export type AddOutcome = "added" | "malformed" | "duplicate";

/** Every Recipient, in the order they were added. */
export async function listRecipients(): Promise<Recipient[]> {
  const { data, error } = await supabaseAdmin.from("recipients").select("*").order("created_at");
  if (error) throw error;
  return data as Recipient[];
}

/** Adds an address; says why when it cannot. The next Digest goes to it. */
export async function addRecipient(input: string): Promise<AddOutcome> {
  const email = normalizeEmail(input);
  if (!isEmail(email)) return "malformed";
  const { error } = await supabaseAdmin.from("recipients").insert({ email });
  if (!error) return "added";
  if (error.code === UNIQUE_VIOLATION) return "duplicate";
  throw error;
}

/** Removes an address; false when there was no such Recipient. */
export async function removeRecipient(id: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from("recipients").delete().eq("id", id).select("id");
  if (error) throw error;
  return data.length === 1;
}
