import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as digestCron } from "@/app/api/cron/digest/route";
import { sendDigest } from "@/digest/send";
import { supabaseAdmin } from "@/lib/supabase";
import { clearItems, insertLinkItem } from "./items";
import { network } from "./network";

type ResendCall = { to: string[]; from: string; subject: string; html: string };

/** Resend accepts every email and records it. */
function resendRecords(calls: ResendCall[]) {
  return http.post("https://api.resend.com/emails", async ({ request }) => {
    calls.push((await request.json()) as ResendCall);
    return HttpResponse.json({ id: `email_${calls.length}` });
  });
}

/** Resend rejects every email, or only those to `onlyTo`, recording the accepted ones in `calls`. */
function resendFails(calls: ResendCall[] = [], onlyTo?: string) {
  return http.post("https://api.resend.com/emails", async ({ request }) => {
    const body = (await request.json()) as ResendCall;
    if (onlyTo && body.to[0] !== onlyTo) {
      calls.push(body);
      return HttpResponse.json({ id: `email_${calls.length}` });
    }
    return HttpResponse.json({ statusCode: 422, message: "Invalid `from` address" }, { status: 422 });
  });
}

async function setRecipients(...emails: string[]) {
  await supabaseAdmin.from("recipients").delete().not("id", "is", null);
  if (emails.length) {
    const { error } = await supabaseAdmin.from("recipients").insert(emails.map((email) => ({ email })));
    if (error) throw error;
  }
}

async function clearDigests() {
  const { error } = await supabaseAdmin.from("digests").delete().not("digest_day", "is", null);
  if (error) throw error;
}

async function sentTo(digestDay: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin.from("digest_sends").select("email").eq("digest_day", digestDay).order("email");
  if (error) throw error;
  return data.map((row) => row.email);
}

// 07:00 Europe/Warsaw on 26 September 2026 (CEST): the Digest Day that ended at 03:00 is 25 September.
const MORNING = new Date("2026-09-26T05:00:10Z");
const DONE = { status: "done" as const, title: "Tytuł", description: "Opis.", recap: "Skrót.", category: "AI/IT" as const };

describe("sendDigest", () => {
  beforeEach(async () => {
    await clearItems();
    await clearDigests();
    await setRecipients("a@example.com", "b@example.com");
  });

  it("sends one identical email per Recipient with the Items of the Digest Day that ended at 03:00", async () => {
    const calls: ResendCall[] = [];
    network.use(resendRecords(calls));
    await insertLinkItem("https://example.com/yesterday", { ...DONE, title: "Wczorajszy", digest_day: "2026-09-25" });
    await insertLinkItem("https://example.com/late-night", { ...DONE, title: "Nocny", digest_day: "2026-09-25" });
    await insertLinkItem("https://example.com/today", { ...DONE, title: "Dzisiejszy", digest_day: "2026-09-26" });
    await insertLinkItem("https://example.com/older", { ...DONE, title: "Starszy", digest_day: "2026-09-24" });

    const result = await sendDigest(MORNING);

    expect(result).toEqual({ status: "sent", digestDay: "2026-09-25", items: 2, recipients: 2, emails: 2 });
    expect(calls.map((call) => call.to)).toEqual([["a@example.com"], ["b@example.com"]]);
    expect(calls[0].html).toBe(calls[1].html);
    expect(calls[0].from).toBe(process.env.DIGEST_FROM);
    expect(calls[0].subject).toBe("Zapisane: 25 września 2026");
    expect(calls[0].html).toContain("Wczorajszy");
    expect(calls[0].html).toContain("Nocny");
    expect(calls[0].html).not.toContain("Dzisiejszy");
    expect(calls[0].html).not.toContain("Starszy");
  });

  it("sends nothing the second time for the same Digest Day", async () => {
    const calls: ResendCall[] = [];
    network.use(resendRecords(calls));
    await insertLinkItem("https://example.com/a", { ...DONE, digest_day: "2026-09-25" });

    await sendDigest(MORNING);
    const again = await sendDigest(MORNING);

    expect(again).toEqual({ status: "already-sent", digestDay: "2026-09-25" });
    expect(calls).toHaveLength(2);
    const { data } = await supabaseAdmin.from("digests").select("*").eq("digest_day", "2026-09-25").single();
    expect(data).toMatchObject({ item_count: 1, recipient_count: 2 });
    expect(data.sent_at).not.toBeNull();
  });

  it("sends an empty Digest when nothing was saved", async () => {
    const calls: ResendCall[] = [];
    network.use(resendRecords(calls));

    const result = await sendDigest(MORNING);

    expect(result).toMatchObject({ status: "sent", items: 0, recipients: 2 });
    expect(calls).toHaveLength(2);
    expect(calls[0].html).toContain("Pusty Digest.");
  });

  it("lists a Failed and a still-Pending Item with the note, and links an Upload to its Panel page", async () => {
    const calls: ResendCall[] = [];
    network.use(resendRecords(calls));
    await insertLinkItem("https://example.com/paywall", { status: "failed", attempts: 3, error: "Page returned 403", digest_day: "2026-09-25" });
    const { data } = await supabaseAdmin
      .from("items")
      .insert({ source: "upload", storage_path: "2026/09/x.jpg", mime_type: "image/jpeg", digest_day: "2026-09-25" })
      .select("id")
      .single();

    await sendDigest(MORNING);

    expect(calls[0].html).toContain("https://example.com/paywall</a> (nie udało się odczytać)");
    expect(calls[0].html).toContain(`${process.env.PANEL_URL}/p/${data!.id}`);
  });

  it("after a partial failure, a second run sends only to the Recipients who did not get it", async () => {
    const first: ResendCall[] = [];
    network.use(resendFails(first, "b@example.com"));
    await expect(sendDigest(MORNING)).rejects.toThrow("Resend 422");
    expect(first.map((call) => call.to[0])).toEqual(["a@example.com"]);
    expect(await sentTo("2026-09-25")).toEqual(["a@example.com"]);
    const { data: unsent } = await supabaseAdmin.from("digests").select("sent_at").eq("digest_day", "2026-09-25").single();
    expect(unsent!.sent_at).toBeNull();

    const second: ResendCall[] = [];
    network.use(resendRecords(second));
    const result = await sendDigest(MORNING);

    expect(result).toMatchObject({ status: "sent", recipients: 2, emails: 1 });
    expect(second.map((call) => call.to[0])).toEqual(["b@example.com"]);
    expect(await sentTo("2026-09-25")).toEqual(["a@example.com", "b@example.com"]);
  });

  it("never sends when Resend rejects everything, and leaves the day open", async () => {
    network.use(resendFails());

    await expect(sendDigest(MORNING)).rejects.toThrow("Resend 422");

    expect(await sentTo("2026-09-25")).toEqual([]);
  });

  it("records the day even with no Recipients", async () => {
    await setRecipients();
    const calls: ResendCall[] = [];
    network.use(resendRecords(calls));

    const result = await sendDigest(MORNING);

    expect(result).toMatchObject({ status: "sent", recipients: 0 });
    expect(calls).toHaveLength(0);
  });
});

describe("GET /api/cron/digest", () => {
  beforeEach(async () => {
    await clearItems();
    await clearDigests();
    await setRecipients("a@example.com");
  });
  afterEach(() => vi.useRealTimers());

  function call(token: string | null) {
    const headers: Record<string, string> = {};
    if (token !== null) headers.authorization = `Bearer ${token}`;
    return digestCron(new Request("http://localhost/api/cron/digest", { headers }));
  }

  it("refuses a request without the cron secret", async () => {
    expect((await call(null)).status).toBe(401);
    expect((await call(process.env.INGEST_TOKEN!)).status).toBe(401);
  });

  it.each([
    ["summer", "2026-07-10T05:00:30Z", "2026-07-09"],
    ["winter", "2026-01-10T06:00:30Z", "2026-01-09"],
  ])("sends at 07:00 Europe/Warsaw in %s", async (_season, at, digestDay) => {
    const calls: ResendCall[] = [];
    network.use(resendRecords(calls));
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(at));

    const res = await call(process.env.CRON_SECRET!);

    expect(await res.json()).toEqual({ status: "sent", digestDay, items: 0, recipients: 1, emails: 1 });
    expect(calls).toHaveLength(1);
  });

  it.each([
    ["summer", "2026-07-10T06:00:30Z"],
    ["winter", "2026-01-10T05:00:30Z"],
  ])("skips the other UTC slot in %s", async (_season, at) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(at));

    expect(await (await call(process.env.CRON_SECRET!)).json()).toEqual({ skipped: true });
  });
});
