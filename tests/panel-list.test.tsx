import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { ItemList } from "@/panel/ItemList";
import { listItems } from "@/panel/items";
import { clearItems, insertLinkItem } from "./items";

const DONE = { status: "done" as const, description: "Opis.", recap: "Skrót." };

async function seed() {
  await insertLinkItem("https://x.com/a/status/1", { ...DONE, title: "Model językowy", category: "AI", saved_at: "2026-09-20T10:00:00Z", digest_day: "2026-09-20" });
  await insertLinkItem("https://example.com/glazura", { ...DONE, title: "Glazura popiołowa", category: "Ceramika", saved_at: "2026-09-22T10:00:00Z", digest_day: "2026-09-22" });
  await insertLinkItem("https://www.instagram.com/p/abc/", { saved_at: "2026-09-25T20:00:00Z", digest_day: "2026-09-25" });
  await insertLinkItem("https://example.com/paywall", { status: "failed", attempts: 3, error: "Page returned 403", saved_at: "2026-09-26T01:00:00Z", digest_day: "2026-09-25" });
}

describe("listItems", () => {
  beforeEach(async () => {
    await clearItems();
    await seed();
  });

  it("returns everything newest first", async () => {
    const items = await listItems({});
    expect(items.map((item) => item.url)).toEqual([
      "https://example.com/paywall",
      "https://www.instagram.com/p/abc/",
      "https://example.com/glazura",
      "https://x.com/a/status/1",
    ]);
  });

  it("narrows to a Category", async () => {
    const items = await listItems({ category: "Ceramika" });
    expect(items.map((item) => item.title)).toEqual(["Glazura popiołowa"]);
  });

  it("narrows to a Digest Day range, inclusive", async () => {
    expect((await listItems({ from: "2026-09-22", to: "2026-09-25" })).map((item) => item.url)).toEqual([
      "https://example.com/paywall",
      "https://www.instagram.com/p/abc/",
      "https://example.com/glazura",
    ]);
    expect((await listItems({ to: "2026-09-20" })).map((item) => item.title)).toEqual(["Model językowy"]);
    expect((await listItems({ from: "2026-09-26" })).map((item) => item.title)).toEqual([]);
  });
});

describe("ItemList", () => {
  beforeEach(async () => {
    await clearItems();
    await seed();
  });

  it("shows title or URL, Source, status, Category and saved date, newest first, in Polish", async () => {
    const html = renderToStaticMarkup(<ItemList items={await listItems({})} filters={{}} />);

    const order = ["https://example.com/paywall", "https://www.instagram.com/p/abc/", "Glazura popiołowa", "Model językowy"].map((s) =>
      html.indexOf(s),
    );
    expect(order.every((position) => position >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);

    expect(html).toContain("<th>Tytuł</th><th>Źródło</th><th>Stan</th><th>Kategoria</th><th>Zapisano</th>");
    expect(html).toContain("<td>Instagram</td><td>Czeka na podsumowanie</td><td>–</td>");
    expect(html).toContain("<td>Web</td><td>Nie odczytano</td>");
    expect(html).toContain("<td>X</td><td>Gotowe</td><td>AI</td>");
    expect(html).toContain('<time dateTime="2026-09-20T10:00:00+00:00">20 wrz 2026, 12:00</time>');
  });

  it("links each Item to its page", async () => {
    const [newest] = await listItems({});
    const html = renderToStaticMarkup(<ItemList items={[newest]} filters={{}} />);
    expect(html).toContain(`<a href="/items/${newest.id}">https://example.com/paywall</a>`);
  });

  it("reflects the filters in the form so the URL and the form agree", async () => {
    const filters = { category: "Ceramika" as const, from: "2026-09-01", to: "2026-09-30" };
    const html = renderToStaticMarkup(<ItemList items={await listItems(filters)} filters={filters} />);

    expect(html).toMatch(/<form[^>]*method="get"/);
    expect(html).toMatch(/<form[^>]*action="\/panel"/);
    expect(html).toContain('<option value="Ceramika" selected="">Ceramika</option>');
    expect(html).toContain('name="from" value="2026-09-01"');
    expect(html).toContain('name="to" value="2026-09-30"');
    expect(html).toContain("Glazura popiołowa");
    expect(html).not.toContain("Model językowy");
  });

  it("says so when nothing matches", () => {
    const html = renderToStaticMarkup(<ItemList items={[]} filters={{ category: "Siłownia" }} />);
    expect(html).toContain("Nic tu nie ma.");
    expect(html).not.toContain("<table");
  });
});
