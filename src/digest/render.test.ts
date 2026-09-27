import { describe, expect, it } from "vitest";
import type { Item } from "@/domain/item";
import { linkFor, renderDigest } from "./render";

const PANEL = "https://zapisane.example";

function item(overrides: Partial<Item>): Item {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    source: "web",
    url: "https://example.com/a",
    normalized_url: "https://example.com/a",
    storage_path: null,
    mime_type: null,
    status: "done",
    attempts: 1,
    title: "Tytuł",
    description: "Opis.",
    recap: "Skrót.",
    category: "AI/IT",
    saved_at: "2026-09-25T10:00:00Z",
    digest_day: "2026-09-25",
    error: null,
    ...overrides,
  };
}

describe("renderDigest", () => {
  it("groups done Items under Category headings in the canonical order, Inne last", () => {
    const { html } = renderDigest(
      "2026-09-25",
      [
        item({ id: "1", category: "Inne", title: "Coś innego" }),
        item({ id: "2", category: "AI/IT", title: "Model" }),
        item({ id: "3", category: "Kuchnia", title: "Glazura" }),
        item({ id: "4", category: "AI/IT", title: "Agent" }),
      ],
      PANEL,
    );

    const order = ["<h2>AI/IT</h2>", "Model", "Agent", "<h2>Kuchnia</h2>", "Glazura", "<h2>Inne</h2>", "Coś innego"].map((s) =>
      html.indexOf(s),
    );
    expect(order.every((position) => position >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).not.toContain("<h2>IT</h2>");
  });

  it("shows title, description and recap for each done Item", () => {
    const { html } = renderDigest("2026-09-25", [item({ description: "Pierwszy akapit.\n\nDrugi akapit." })], PANEL);

    expect(html).toContain('<a href="https://example.com/a">Tytuł</a>');
    expect(html).toContain("<p>Pierwszy akapit.</p><p>Drugi akapit.</p>");
    expect(html).toContain("<em>Skrót.</em>");
  });

  it.each([
    ["a link Item points at the original", item({ url: "https://x.com/a/status/1" }), "https://x.com/a/status/1"],
    ["an Upload points at its public page", item({ id: "abc", source: "upload", url: null, storage_path: "2026/09/x.jpg" }), `${PANEL}/p/abc`],
  ])("%s", (_name, saved, expected) => {
    expect(linkFor(saved, PANEL)).toBe(expected);
  });

  it("lists Failed and still-Pending Items with their link and the note", () => {
    const { html } = renderDigest(
      "2026-09-25",
      [
        item({ id: "f", status: "failed", title: null, category: null, url: "https://example.com/paywall" }),
        item({ id: "p", status: "pending", title: null, category: null, source: "upload", url: null }),
      ],
      PANEL,
    );

    expect(html).toContain("<h2>Nie udało się odczytać</h2>");
    expect(html).toContain('<a href="https://example.com/paywall">https://example.com/paywall</a> (nie udało się odczytać)');
    expect(html).toContain(`<a href="${PANEL}/p/p">Plik z urządzenia</a> (nie udało się odczytać)`);
  });

  it("renders an empty Digest that says so", () => {
    const { subject, html } = renderDigest("2026-09-25", [], PANEL);

    expect(subject).toBe("Zapisane: 25 września 2026");
    expect(html).toContain("Pusty Digest.");
    expect(html).toContain("Tego dnia nic nie zostało zapisane.");
    expect(html).not.toContain("<h2>");
  });

  it("files a done Item whose Category is not on the list under Inne", () => {
    const { html } = renderDigest("2026-09-25", [item({ category: "Historia" as never, title: "Stare dzieje" })], PANEL);

    expect(html).toContain("<h2>Inne</h2>");
    expect(html).toContain("Stare dzieje");
  });

  it("escapes HTML coming from the Summary", () => {
    const { html } = renderDigest("2026-09-25", [item({ title: "<script>x</script> & co" })], PANEL);

    expect(html).toContain("&lt;script&gt;x&lt;/script&gt; &amp; co");
    expect(html).not.toContain("<script>");
  });

  it("contains no images", () => {
    const { html } = renderDigest("2026-09-25", [item({}), item({ id: "2", source: "upload", url: null })], PANEL);
    expect(html).not.toMatch(/<img/i);
  });
});
