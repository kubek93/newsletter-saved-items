import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { supabaseAdmin } from "@/lib/supabase";
import { Browse } from "@/public/BrowseView";
import { listPublicItems, parseBrowseFilters } from "@/public/browse";
import { clearItems, insertLinkItem } from "./items";

const DONE = { status: "done" as const, description: Array(220).fill("słowo").join(" "), recap: "Krótko o tym." };

async function seed() {
  await insertLinkItem("https://x.com/a/status/1", { ...DONE, title: "Model językowy", category: "AI/IT", saved_at: "2026-09-26T10:00:00Z", digest_day: "2026-09-26" });
  await insertLinkItem("https://example.com/glazura", { ...DONE, title: "Glazura popiołowa", category: "Kuchnia", saved_at: "2026-09-25T10:00:00Z", digest_day: "2026-09-25" });
  await insertLinkItem("https://www.instagram.com/p/abc/", { ...DONE, title: "Reel o mobilności", category: "Sport", saved_at: "2026-09-25T08:00:00Z", digest_day: "2026-09-25" });
  await insertLinkItem("https://example.com/pending", { saved_at: "2026-09-26T12:00:00Z", digest_day: "2026-09-26" });
  await insertLinkItem("https://example.com/paywall", { status: "failed", attempts: 3, error: "403", saved_at: "2026-09-26T13:00:00Z", digest_day: "2026-09-26" });
  await supabaseAdmin.from("items").insert({
    source: "upload", storage_path: "2026/09/00000000-0000-0000-0000-000000000009-kubek.jpg", mime_type: "image/jpeg",
    ...DONE, title: "Kubek z pieca", category: "Kuchnia", saved_at: "2026-09-24T10:00:00Z", digest_day: "2026-09-24",
  });
}

describe("listPublicItems", () => {
  beforeEach(async () => {
    await clearItems();
    await seed();
  });

  it("returns only Items with a Summary, newest Digest Day first", async () => {
    const items = await listPublicItems();
    expect(items.map((i) => i.title)).toEqual(["Model językowy", "Glazura popiołowa", "Reel o mobilności", "Kubek z pieca"]);
    expect(items.every((i) => !("error" in i) && !("attempts" in i))).toBe(true);
  });
});

describe("Browse", () => {
  beforeEach(async () => {
    await clearItems();
    await seed();
  });

  it("shows tiles in sections per Digest Day with title, grey Source and reading time", async () => {
    const html = renderToStaticMarkup(<Browse items={await listPublicItems()} filters={{}} />);

    const order = ["26 WRZEŚNIA 2026", "Model językowy", "25 WRZEŚNIA 2026", "Glazura popiołowa", "Reel o mobilności", "24 WRZEŚNIA 2026", "Kubek z pieca"].map((s) => html.indexOf(s));
    expect(order.every((p) => p >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).toContain('<span>𝕏 X</span><span>🤖 AI/IT</span><span>1 min czytania</span>');
    expect(html).toContain('<span>📁 Plik</span><span>🍜 Kuchnia</span>');
    expect(html).toContain('<p class="tagline">Krótko o tym.</p>');
    expect(html).toMatch(/<a href="\/p\/[0-9a-f-]{36}"><h3>Glazura popiołowa<\/h3>/);
    expect(html).not.toContain('href="https://example.com/glazura"');
    expect(html).not.toContain("pending");
    expect(html).not.toContain("paywall");
  });

  it("lists Categories alphabetically and Sources with counts, marking the selection", async () => {
    const html = renderToStaticMarkup(<Browse items={await listPublicItems()} filters={{ category: "Kuchnia" }} />);

    const categories = [...html.matchAll(/<span>([^<]+)<\/span><span class="count">(\d+)<\/span>/g)].map((m) => [m[1], m[2]]);
    expect(categories.slice(0, 4)).toEqual([["Wszystkie", "4"], ["🤖 AI/IT", "1"], ["🔌 Elektronika", "0"], ["💰 Finanse", "0"]]);
    expect(categories).toContainEqual(["🌐 Web", "1"]);
    expect(categories).toContainEqual(["📁 Plik", "1"]);
    expect(html).toContain('<li class="active"><a href="/?category=Kuchnia">');
    expect(html).toContain("Glazura popiołowa");
    expect(html).toContain("Kubek z pieca");
    expect(html).not.toContain("Model językowy");
  });

  it("combines a Category and a Source, with links that keep the other filter", async () => {
    const filters = parseBrowseFilters({ category: "Kuchnia", source: "upload" });
    const html = renderToStaticMarkup(<Browse items={await listPublicItems()} filters={filters} />);

    expect(html).toContain("Kubek z pieca");
    expect(html).not.toContain("Glazura popiołowa");
    expect(html).toContain('href="/?category=AI%2FIT&amp;source=upload"');
    expect(html).toContain('href="/?category=Kuchnia&amp;source=web"');
  });

  it("folds the filters behind a label that names the active ones", async () => {
    const html = renderToStaticMarkup(<Browse items={await listPublicItems()} filters={{ category: "AI/IT", source: "x" }} />);
    expect(html).toContain('<input type="checkbox" id="filters-toggle" class="filters-toggle"/>');
    expect(html).toContain('<label for="filters-toggle" class="filters-label">Filtry: AI/IT · X</label>');
  });

  it("says so when nothing matches", () => {
    const html = renderToStaticMarkup(<Browse items={[]} filters={{}} />);
    expect(html).toContain("Nic tu jeszcze nie ma.");
  });
});
