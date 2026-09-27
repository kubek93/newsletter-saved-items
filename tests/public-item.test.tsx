import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { newUploadItem } from "@/domain/upload-item";
import { supabaseAdmin } from "@/lib/supabase";
import { uploadsBucket } from "@/lib/uploads";
import { loadPublicItem } from "@/public/browse";
import { embedFor } from "@/public/embed";
import { PublicItemView } from "@/public/PublicItemView";
import { clearItems, insertLinkItem } from "./items";

const DONE = { status: "done" as const, title: "Szkliwo: jak działa", description: "Pierwszy akapit.\n\nDrugi akapit.", recap: "Szkliwo to szklista powłoka chroniąca ceramikę.", category: "Kuchnia" as const };

describe("loadPublicItem", () => {
  beforeEach(clearItems);

  it("returns a done Item and nothing for Pending, Failed or unknown ones", async () => {
    const done = await insertLinkItem("https://example.com/a", DONE);
    const pending = await insertLinkItem("https://example.com/b");
    const failed = await insertLinkItem("https://example.com/c", { status: "failed", attempts: 3, error: "x" });

    expect((await loadPublicItem(done))?.item.title).toBe("Szkliwo: jak działa");
    expect(await loadPublicItem(pending)).toBeNull();
    expect(await loadPublicItem(failed)).toBeNull();
    expect(await loadPublicItem("00000000-0000-0000-0000-00000000dead")).toBeNull();
  });

  it("hands out a signed URL for an Upload's file", async () => {
    const path = "2026/09/00000000-0000-0000-0000-000000000011-kubek.jpg";
    await uploadsBucket().upload(path, new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" }), { contentType: "image/jpeg", upsert: true });
    const { data } = await supabaseAdmin.from("items").insert({ ...newUploadItem(path, "image/jpeg"), ...DONE }).select("id").single();

    const loaded = await loadPublicItem(data!.id);

    expect(loaded?.media?.[0].video).toBe(false);
    expect(loaded?.media?.[0].url).toContain("/storage/v1/object/sign/uploads/");
    expect((await fetch(loaded!.media![0].url)).status).toBe(200);
  });
});

describe("PublicItemView", () => {
  beforeEach(clearItems);

  it("shows the sentence, the summary, the source embed and a large open button, in that order", async () => {
    const id = await insertLinkItem("https://www.youtube.com/watch?v=jNQXAC9IVRw", { ...DONE, category: "Inne" });
    const { item } = (await loadPublicItem(id))!;

    const html = renderToStaticMarkup(<PublicItemView item={item} embed={embedFor(item)} openUrl={item.url} />);

    const order = [
      '<span class="badge">▶️ YouTube</span>',
      '<span class="badge">📌 Inne</span>',
      "<h1>Szkliwo: jak działa</h1>",
      "<h2>Krótki opis</h2>",
      '<p class="lead">Szkliwo to szklista powłoka chroniąca ceramikę.</p>',
      "<h2>Opis</h2>",
      "<p>Pierwszy akapit.</p><p>Drugi akapit.</p>",
      "<h2>Źródło</h2>",
      'src="https://www.youtube.com/embed/jNQXAC9IVRw"',
      'class="button-small" href="/"',
      'class="button-large" href="https://www.youtube.com/watch?v=jNQXAC9IVRw"',
      "Otwórz źródło",
    ].map((s) => html.indexOf(s));
    expect(order.every((p) => p >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).toContain('<a class="button-back" href="/">← Wszystkie</a>');
    expect(html).not.toContain("/delete");
  });

  it("gives the signed-in Owner a small delete button between back and open, sending them back to the list", async () => {
    const id = await insertLinkItem("https://example.com/a", DONE);
    const { item } = (await loadPublicItem(id))!;

    const html = renderToStaticMarkup(<PublicItemView item={item} embed={embedFor(item)} openUrl={item.url} owner />);

    expect(html).toContain(`<form class="inline" action="/items/${id}/delete" method="post"><input type="hidden" name="back" value="/"/><button type="submit" class="button-small danger">Usuń</button></form>`);
    expect(html.indexOf('class="button-small" href="/"')).toBeLessThan(html.indexOf("/delete"));
    expect(html.indexOf("/delete")).toBeLessThan(html.indexOf('class="button-large"'));
  });

  it("renders the description's paragraphs and bullet lists", async () => {
    const item = (await loadPublicItem(await insertLinkItem("https://example.com/lista", { ...DONE, description: "Wstęp.\n\n- Krok pierwszy\n- Krok drugi\n\nZakończenie\nw dwóch liniach." })))!.item;

    const html = renderToStaticMarkup(<PublicItemView item={item} embed={embedFor(item)} openUrl={item.url} />);

    expect(html).toContain("<h2>Opis</h2><p>Wstęp.</p><ul><li>Krok pierwszy</li><li>Krok drugi</li></ul><p>Zakończenie w dwóch liniach.</p>");
  });

  it("embeds an X post and an Instagram post with the platforms' widgets", async () => {
    const x = (await loadPublicItem(await insertLinkItem("https://x.com/jack/status/20", DONE)))!.item;
    const ig = (await loadPublicItem(await insertLinkItem("https://www.instagram.com/reel/abc/", DONE)))!.item;

    const xHtml = renderToStaticMarkup(<PublicItemView item={x} embed={embedFor(x)} openUrl={x.url} />);
    const igHtml = renderToStaticMarkup(<PublicItemView item={ig} embed={embedFor(ig)} openUrl={ig.url} />);

    expect(xHtml).toContain('<blockquote class="twitter-tweet" data-dnt="true" data-lang="pl"><a href="https://twitter.com/jack/status/20">');
    expect(igHtml).toContain('data-instgrm-permalink="https://www.instagram.com/reel/abc/"');
    expect(igHtml).toContain('<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/reel/abc/"');
  });

  it("shows a link card for an ordinary page and the file itself for an Upload", async () => {
    const page = (await loadPublicItem(await insertLinkItem("https://www.example.com/artykul", DONE)))!.item;
    const pageHtml = renderToStaticMarkup(<PublicItemView item={page} embed={embedFor(page)} openUrl={page.url} />);
    expect(pageHtml).toContain('<span class="host">example.com</span>');

    const upload = { ...page, source: "upload" as const, url: null };
    const media = [{ url: "https://storage.example/x.mp4?token=1", video: true }];
    const uploadHtml = renderToStaticMarkup(<PublicItemView item={upload} embed={embedFor(upload, media)} openUrl={media[0].url} />);
    expect(uploadHtml).toMatch(/<video class="preview" src="https:\/\/storage.example\/x.mp4\?token=1" controls=""/);
    expect(uploadHtml).not.toContain('class="gallery"');
    expect(uploadHtml).toContain("Otwórz plik");

    const collection = [{ url: "https://storage.example/a.jpg?token=1", video: false }, { url: "https://storage.example/b.jpg?token=2", video: false }];
    const galleryHtml = renderToStaticMarkup(<PublicItemView item={upload} embed={embedFor(upload, collection)} openUrl={collection[0].url} />);
    expect(galleryHtml).toContain('<div class="gallery"><img class="preview" src="https://storage.example/a.jpg?token=1" alt=""/><img class="preview" src="https://storage.example/b.jpg?token=2" alt=""/></div>');
  });
});
