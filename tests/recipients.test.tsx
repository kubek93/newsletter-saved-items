import { http, HttpResponse } from "msw";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { POST as postAdd } from "@/app/recipients/add/route";
import { POST as postDelete } from "@/app/recipients/[id]/delete/route";
import { sendDigest } from "@/digest/send";
import { supabaseAdmin } from "@/lib/supabase";
import { RecipientList } from "@/panel/RecipientList";
import { addRecipient, listRecipients, removeRecipient } from "@/panel/recipients";
import { clearItems } from "./items";
import { network } from "./network";
import { formRequest, sessionCookiesFor } from "./session";

const OWNER = process.env.OWNER_EMAIL!;

async function clearRecipients() {
  const { error } = await supabaseAdmin.from("recipients").delete().not("id", "is", null);
  if (error) throw error;
  await supabaseAdmin.from("digests").delete().not("digest_day", "is", null);
}

async function add(email: string, cookies = sessionCookiesFor(OWNER)) {
  return postAdd(formRequest("/recipients/add", { email }, await cookies));
}

describe("Recipients page", () => {
  beforeEach(clearRecipients);

  it("lists every address with the date it was added, oldest first", async () => {
    await supabaseAdmin.from("recipients").insert([
      { email: "ania@example.com", created_at: "2026-09-01T10:00:00Z" },
      { email: "bartek@example.com", created_at: "2026-09-20T10:00:00Z" },
    ]);

    const html = renderToStaticMarkup(<RecipientList recipients={await listRecipients()} outcome={null} />);

    expect(html.indexOf("ania@example.com")).toBeLessThan(html.indexOf("bartek@example.com"));
    expect(html).toContain('<time dateTime="2026-09-01T10:00:00+00:00">1 września 2026</time>');
    expect(html).toContain("<h2>Odbiorcy Digestu</h2>");
    expect(html).toContain('action="/recipients/add"');
    expect(html).toMatch(/action="\/recipients\/[0-9a-f-]{36}\/delete"/);
  });

  it("says so when nobody receives the Digest yet", () => {
    const html = renderToStaticMarkup(<RecipientList recipients={[]} outcome={null} />);
    expect(html).toContain("Nikt jeszcze nie dostaje Digestu.");
  });

  it.each([
    ["added", "Dodano. Następny Digest trafi także na ten adres."],
    ["malformed", "To nie wygląda na adres e-mail."],
    ["duplicate", "Ten adres już dostaje Digest."],
  ] as const)("shows the %s message in Polish", (outcome, message) => {
    const html = renderToStaticMarkup(<RecipientList recipients={[]} outcome={outcome} attempted="x" />);
    expect(html).toContain(message);
  });

  it("keeps a rejected address in the field so it can be corrected", () => {
    const html = renderToStaticMarkup(<RecipientList recipients={[]} outcome="malformed" attempted="ania@" />);
    expect(html).toMatch(/<input[^>]*name="email"[^>]*value="ania@"/);
  });
});

describe("POST /recipients/add", () => {
  beforeEach(clearRecipients);

  it("adds a valid address and reports it", async () => {
    const res = await add(" Ania@Example.com ");

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${process.env.PANEL_URL}/recipients?outcome=added`);
    expect((await listRecipients()).map((r) => r.email)).toEqual(["ania@example.com"]);
  });

  it("rejects a malformed address with the reason and the attempt in the URL", async () => {
    const res = await add("ania@");

    expect(res.headers.get("location")).toBe(`${process.env.PANEL_URL}/recipients?outcome=malformed&email=ania%40`);
    expect(await listRecipients()).toEqual([]);
  });

  it("rejects a duplicate, whatever the spelling", async () => {
    await add("ania@example.com");

    const res = await add("ANIA@example.com");

    expect(res.headers.get("location")).toContain("outcome=duplicate");
    expect(await listRecipients()).toHaveLength(1);
  });

  it("rejects a duplicate of an address that was added by SQL in another spelling", async () => {
    await supabaseAdmin.from("recipients").insert({ email: "Ania@Example.com" });

    const res = await add("ania@example.com");

    expect(res.headers.get("location")).toContain("outcome=duplicate");
    expect(await listRecipients()).toHaveLength(1);
  });

  it("refuses anyone but the Owner", async () => {
    expect((await add("ania@example.com", Promise.resolve([]))).status).toBe(401);
    expect((await add("ania@example.com", sessionCookiesFor("stranger@example.com"))).status).toBe(401);
    expect(await listRecipients()).toEqual([]);
  });

  it("makes the address receive the next Digest", async () => {
    await clearItems();
    const sentTo: string[] = [];
    network.use(
      http.post("https://api.resend.com/emails", async ({ request }) => {
        sentTo.push(((await request.json()) as { to: string[] }).to[0]);
        return HttpResponse.json({ id: "email_1" });
      }),
    );
    await add("nowy@example.com");

    await sendDigest(new Date("2026-09-26T05:00:10Z"));

    expect(sentTo).toEqual(["nowy@example.com"]);
  });
});

describe("POST /recipients/[id]/delete", () => {
  beforeEach(clearRecipients);

  it("removes the address and returns to the page", async () => {
    await addRecipient("ania@example.com");
    const [{ id }] = await listRecipients();

    const res = await postDelete(formRequest(`/recipients/${id}/delete`, {}, await sessionCookiesFor(OWNER)), {
      params: Promise.resolve({ id }),
    });

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${process.env.PANEL_URL}/recipients`);
    expect(await listRecipients()).toEqual([]);
  });

  it("stops the Digest for the removed address", async () => {
    await clearItems();
    const sentTo: string[] = [];
    network.use(
      http.post("https://api.resend.com/emails", async ({ request }) => {
        sentTo.push(((await request.json()) as { to: string[] }).to[0]);
        return HttpResponse.json({ id: "email_1" });
      }),
    );
    await addRecipient("zostaje@example.com");
    await addRecipient("odchodzi@example.com");
    const leaving = (await listRecipients()).find((r) => r.email === "odchodzi@example.com")!;

    await postDelete(formRequest(`/recipients/${leaving.id}/delete`, {}, await sessionCookiesFor(OWNER)), {
      params: Promise.resolve({ id: leaving.id }),
    });
    await sendDigest(new Date("2026-09-26T05:00:10Z"));

    expect(sentTo).toEqual(["zostaje@example.com"]);
  });

  it("answers 404 for an address that is already gone", async () => {
    await addRecipient("ania@example.com");
    const [{ id }] = await listRecipients();
    await removeRecipient(id);

    const res = await postDelete(formRequest(`/recipients/${id}/delete`, {}, await sessionCookiesFor(OWNER)), {
      params: Promise.resolve({ id }),
    });

    expect(res.status).toBe(404);
  });

  it("refuses anyone but the Owner", async () => {
    await addRecipient("ania@example.com");
    const [{ id }] = await listRecipients();

    const anonymous = await postDelete(formRequest(`/recipients/${id}/delete`, {}), { params: Promise.resolve({ id }) });
    const stranger = await postDelete(
      formRequest(`/recipients/${id}/delete`, {}, await sessionCookiesFor("stranger@example.com")),
      { params: Promise.resolve({ id }) },
    );

    expect(anonymous.status).toBe(401);
    expect(stranger.status).toBe(401);
    expect(await listRecipients()).toHaveLength(1);
  });
});
