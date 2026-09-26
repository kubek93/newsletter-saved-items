import { digestDayEndedBefore } from "@/domain/digest-day";
import type { Item } from "@/domain/item";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase";
import { renderDigest } from "./render";

const RESEND_API = "https://api.resend.com/emails";
const UNIQUE_VIOLATION = "23505";

export type DigestResult =
  | { status: "sent"; digestDay: string; items: number; recipients: number; emails: number }
  | { status: "already-sent"; digestDay: string };

/** Takes one Recipient's copy for this Digest Day. False when it was already taken (sent, or being sent). */
async function claimSend(digestDay: string, email: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from("digest_sends").insert({ digest_day: digestDay, email });
  if (!error) return true;
  if (error.code === UNIQUE_VIOLATION) return false;
  throw error;
}

async function releaseSend(digestDay: string, email: string): Promise<void> {
  await supabaseAdmin.from("digest_sends").delete().match({ digest_day: digestDay, email });
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: { authorization: `Bearer ${env.resendApiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.digestFrom, to: [to], subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

/**
 * Sends the Digest for the Digest Day that ended this morning to every Recipient, each exactly once.
 * Items are taken as they are at send time. Safe to run again after a partial failure or as a doubled
 * cron invocation: only Recipients without a recorded copy get one, and the day is marked sent when all have.
 */
export async function sendDigest(now = new Date()): Promise<DigestResult> {
  const digestDay = digestDayEndedBefore(now);

  const existing = await supabaseAdmin.from("digests").select("sent_at").eq("digest_day", digestDay).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.sent_at) return { status: "already-sent", digestDay };
  if (!existing.data) {
    const { error } = await supabaseAdmin.from("digests").insert({ digest_day: digestDay });
    if (error && error.code !== UNIQUE_VIOLATION) throw error;
  }

  const [items, recipients] = await Promise.all([
    supabaseAdmin.from("items").select("*").eq("digest_day", digestDay).order("saved_at"),
    supabaseAdmin.from("recipients").select("email").order("created_at"),
  ]);
  if (items.error) throw items.error;
  if (recipients.error) throw recipients.error;

  const { subject, html } = renderDigest(digestDay, items.data as Item[], env.panelUrl);
  let emails = 0;
  for (const { email } of recipients.data) {
    if (!(await claimSend(digestDay, email))) continue;
    try {
      await sendEmail(email, subject, html);
      emails += 1;
    } catch (cause) {
      await releaseSend(digestDay, email);
      throw cause;
    }
  }

  const { error } = await supabaseAdmin
    .from("digests")
    .update({ sent_at: now.toISOString(), item_count: items.data.length, recipient_count: recipients.data.length })
    .eq("digest_day", digestDay);
  if (error) throw error;
  return { status: "sent", digestDay, items: items.data.length, recipients: recipients.data.length, emails };
}
