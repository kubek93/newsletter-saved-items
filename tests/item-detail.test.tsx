import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { POST as postCategory } from "@/app/items/[id]/category/route";
import { POST as postDelete } from "@/app/items/[id]/delete/route";
import { CATEGORIES } from "@/domain/category";
import { newUploadItem } from "@/domain/upload-item";
import { supabaseAdmin } from "@/lib/supabase";
import { uploadsBucket } from "@/lib/uploads";
import { ItemDetail } from "@/panel/ItemDetail";
import { loadItem, mediaFor } from "@/panel/items";
import { allItems, clearItems, getItem, insertLinkItem } from "./items";
import { formRequest, sessionCookiesFor } from "./session";

const OWNER = process.env.OWNER_EMAIL!;
const DONE = { status: "done" as const, title: "Glazura popiołowa", description: "Pierwszy akapit.\n\nDrugi akapit.", recap: "Krótko.", category: "Kuchnia" as const };
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

async function insertUpload(path: string, mimeType: "image/jpeg" | "video/mp4", bytes = JPEG) {
  const { error: uploadError } = await uploadsBucket().upload(path, new Blob([bytes], { type: mimeType }), { contentType: mimeType, upsert: true });
  if (uploadError) throw uploadError;
  const { data, error } = await supabaseAdmin.from("items").insert(newUploadItem(path, mimeType)).select("id").single();
  if (error) throw error;
  return data.id as string;
}

type FormHandler = (request: import("next/server").NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>;

async function postForm(handler: FormHandler, path: string, fields: Record<string, string>, cookies = sessionCookiesFor(OWNER)) {
  const id = path.split("/")[2];
  return handler(formRequest(path, fields, await cookies), { params: Promise.resolve({ id }) });
}

describe("ItemDetail", () => {
  beforeEach(clearItems);

  it("shows the Summary in sections, the Source link and embed, status, Category and date for a link Item", async () => {
    const id = await insertLinkItem("https://example.com/glazura", { ...DONE, saved_at: "2026-09-22T10:00:00Z" });
    const item = (await loadItem(id))!;

    const html = renderToStaticMarkup(<ItemDetail item={item} media={await mediaFor(item)} />);

    expect(html).toContain("<h2>Glazura popiołowa</h2>");
    expect(html).toContain('<a href="https://example.com/glazura" rel="noreferrer">Web: https://example.com/glazura</a>');
    expect(html).toContain('<dd class="done">Gotowe</dd>');
    expect(html).toContain('<h3>W jednym zdaniu</h3><p class="lead">Krótko.</p>');
    expect(html).toContain("<h3>Streszczenie</h3><p>Pierwszy akapit.</p><p>Drugi akapit.</p>");
    expect(html).toContain("<h3>Źródło</h3>");
    expect(html).toContain('<a class="link-card" href="https://example.com/glazura"');
    expect(html.indexOf("W jednym zdaniu")).toBeLessThan(html.indexOf("Streszczenie"));
    expect(html.indexOf("Streszczenie")).toBeLessThan(html.indexOf("<h3>Źródło</h3>"));
    expect(html).toContain('<option value="Kuchnia" selected="">Kuchnia</option>');
    expect(html).toContain("22 września 2026 12:00");
    expect(html).not.toContain("<img");
  });

  it("offers every Category", async () => {
    const id = await insertLinkItem("https://example.com/a", DONE);
    const item = (await loadItem(id))!;

    const html = renderToStaticMarkup(<ItemDetail item={item} media={null} />);

    expect(html.match(/<option value="[^"]+"/g)).toHaveLength(CATEGORIES.length);
    expect(html).toContain('action="/items/' + id + '/category"');
  });

  it("shows the stored error for a Failed Item", async () => {
    const id = await insertLinkItem("https://example.com/paywall", { status: "failed", attempts: 3, error: "Page returned 403: Forbidden" });
    const html = renderToStaticMarkup(<ItemDetail item={(await loadItem(id))!} media={null} />);

    expect(html).toContain("Nie udało się odczytać: <code>Page returned 403: Forbidden</code>");
    expect(html).toContain('<dd class="failed">Nie odczytano</dd>');
  });

  it("embeds a YouTube video and an X post the way the public page does", async () => {
    const yt = (await loadItem(await insertLinkItem("https://www.youtube.com/watch?v=jNQXAC9IVRw", DONE)))!;
    const x = (await loadItem(await insertLinkItem("https://x.com/jack/status/20", DONE)))!;

    const ytHtml = renderToStaticMarkup(<ItemDetail item={yt} media={null} />);
    const xHtml = renderToStaticMarkup(<ItemDetail item={x} media={null} />);

    expect(ytHtml).toContain('src="https://www.youtube.com/embed/jNQXAC9IVRw"');
    expect(xHtml).toContain('<blockquote class="twitter-tweet">');
    expect(xHtml).toContain('src="https://platform.twitter.com/widgets.js"');
  });

  it("previews an uploaded photo through a signed Storage URL", async () => {
    const id = await insertUpload("2026/09/00000000-0000-0000-0000-000000000001-kubek.jpg", "image/jpeg");
    const item = (await loadItem(id))!;

    const media = await mediaFor(item);
    const html = renderToStaticMarkup(<ItemDetail item={item} media={media} />);

    expect(media?.kind).toBe("image");
    expect(html).toContain('<h3>Źródło</h3>');
    expect(html).toContain(`<img class="preview" src="${media!.url.replace(/&/g, "&amp;")}" alt=""/>`);
    expect(media!.url).toContain("/storage/v1/object/sign/uploads/");
    expect((await fetch(media!.url)).status).toBe(200);
  });

  it("previews an uploaded video with a video element", async () => {
    const id = await insertUpload("2026/09/00000000-0000-0000-0000-000000000002-clip.mp4", "video/mp4");
    const item = (await loadItem(id))!;

    const media = await mediaFor(item);
    const html = renderToStaticMarkup(<ItemDetail item={item} media={media} />);

    expect(media?.kind).toBe("video");
    expect(html).toMatch(/<video class="preview" src="[^"]+" controls="" preload="metadata">/);
  });
});

describe("POST /items/[id]/category", () => {
  beforeEach(clearItems);

  it("stores the Owner's Category, returns to the Item page, which then shows the new value", async () => {
    const id = await insertLinkItem("https://example.com/a", DONE);

    const res = await postForm(postCategory, `/items/${id}/category`, { category: "Sport" });

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${process.env.PANEL_URL}/items/${id}`);
    const item = (await loadItem(id))!;
    expect(item.category).toBe("Sport");
    const html = renderToStaticMarkup(<ItemDetail item={item} media={null} />);
    expect(html).toContain('<option value="Sport" selected="">Sport</option>');
    expect(html).not.toContain('<option value="Kuchnia" selected="">');
  });

  it("refuses a form posted from another site", async () => {
    const id = await insertLinkItem("https://example.com/a", DONE);
    const request = formRequest(`/items/${id}/category`, { category: "AI/IT" }, await sessionCookiesFor(OWNER));
    request.headers.set("origin", "https://evil.example");

    const res = await postCategory(request, { params: Promise.resolve({ id }) });

    expect(res.status).toBe(403);
    expect((await getItem(id)).category).toBe("Kuchnia");
  });

  it("accepts a form posted from the Panel itself", async () => {
    const id = await insertLinkItem("https://example.com/a", DONE);
    const request = formRequest(`/items/${id}/category`, { category: "AI/IT" }, await sessionCookiesFor(OWNER));
    request.headers.set("origin", new URL(process.env.PANEL_URL!).origin);

    expect((await postCategory(request, { params: Promise.resolve({ id }) })).status).toBe(303);
  });

  it("refuses a Category outside the list", async () => {
    const id = await insertLinkItem("https://example.com/a", DONE);

    const res = await postForm(postCategory, `/items/${id}/category`, { category: "Ogrodnictwo" });

    expect(res.status).toBe(400);
    expect((await getItem(id)).category).toBe("Kuchnia");
  });

  it("refuses anyone but the Owner", async () => {
    const id = await insertLinkItem("https://example.com/a", DONE);

    expect((await postForm(postCategory, `/items/${id}/category`, { category: "AI/IT" }, Promise.resolve([]))).status).toBe(401);
    expect((await postForm(postCategory, `/items/${id}/category`, { category: "AI/IT" }, sessionCookiesFor("stranger@example.com"))).status).toBe(401);
    expect((await getItem(id)).category).toBe("Kuchnia");
  });

  it("answers 404 for an Item that does not exist", async () => {
    const res = await postForm(postCategory, "/items/00000000-0000-0000-0000-00000000dead/category", { category: "AI/IT" });
    expect(res.status).toBe(404);
  });
});

describe("POST /items/[id]/delete", () => {
  beforeEach(clearItems);

  it("removes a link Item and returns to the list", async () => {
    const id = await insertLinkItem("https://example.com/a", DONE);

    const res = await postForm(postDelete, `/items/${id}/delete`, {});

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${process.env.PANEL_URL}/panel`);
    expect(await allItems()).toHaveLength(0);
  });

  it("removes an Upload together with its file", async () => {
    const path = "2026/09/00000000-0000-0000-0000-000000000003-gone.jpg";
    const id = await insertUpload(path, "image/jpeg");

    await postForm(postDelete, `/items/${id}/delete`, {});

    expect(await allItems()).toHaveLength(0);
    const { data } = await uploadsBucket().exists(path);
    expect(data).toBe(false);
  });

  it("refuses anyone but the Owner", async () => {
    const id = await insertLinkItem("https://example.com/a", DONE);

    expect((await postForm(postDelete, `/items/${id}/delete`, {}, Promise.resolve([]))).status).toBe(401);
    expect(await allItems()).toHaveLength(1);
  });
});
