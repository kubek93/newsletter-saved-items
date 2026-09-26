import { digestDayEndedBefore } from "@/domain/digest-day";
import type { Item } from "@/domain/item";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase";
import { renderDigest } from "./render";

const RESEND_API = "https://api.resend.com/emails";
const UNIQUE_VIOLATION = "23505";

export type DigestResult =
  | { status: "sent"; digestDay: string; items: number; recipients: number }
  | { status: "already-sent"; digestDay: string };

/** Takes the Digest Day for sending. False when another run already has it (a doubled cron invocation). */
async function claimDigestDay(digestDay: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from("digests").insert({ digest_day: digestDay });
  if (!error) return true;
  if (error.code === UNIQUE_VIOLATION) return false;
  throw error;
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
 * Sends the Digest for the Digest Day that ended this morning to every Recipient, once. Items are taken
 * as they are at send time: a Summary written later is not re-sent. A failed send releases the day so the
 * next run can try again.
 */
export async function sendDigest(now = new Date()): Promise<DigestResult> {
  const digestDay = digestDayEndedBefore(now);
  if (!(await claimDigestDay(digestDay))) return { status: "already-sent", digestDay };

  try {
    const [items, recipients] = await Promise.all([
      supabaseAdmin.from("items").select("*").eq("digest_day", digestDay).order("saved_at"),
      supabaseAdmin.from("recipients").select("email").order("created_at"),
    ]);
    if (items.error) throw items.error;
    if (recipients.error) throw recipients.error;

    const { subject, html } = renderDigest(digestDay, items.data as Item[], env.panelUrl);
    for (const { email } of recipients.data) {
      await sendEmail(email, subject, html);
    }

    const { error } = await supabaseAdmin
      .from("digests")
      .update({ sent_at: now.toISOString(), item_count: items.data.length, recipient_count: recipients.data.length })
      .eq("digest_day", digestDay);
    if (error) throw error;
    return { status: "sent", digestDay, items: items.data.length, recipients: recipients.data.length };
  } catch (cause) {
    await supabaseAdmin.from("digests").delete().eq("digest_day", digestDay);
    throw cause;
  }
}
