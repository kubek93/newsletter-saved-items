import { describe, expect, it } from "vitest";
import { applyFilters, countBy, groupByDigestDay, parseBrowseFilters, type PublicItem } from "./browse";

function item(overrides: Partial<PublicItem>): PublicItem {
  return {
    id: "1",
    source: "web",
    url: "https://example.com/a",
    title: "T",
    description: "Opis.",
    recap: "Skrót.",
    category: "AI/IT",
    digest_day: "2026-09-25",
    saved_at: "2026-09-25T10:00:00Z",
    ...overrides,
  };
}

describe("groupByDigestDay", () => {
  it("makes one section per consecutive Digest Day, keeping order", () => {
    const sections = groupByDigestDay([
      item({ id: "a", digest_day: "2026-09-26" }),
      item({ id: "b", digest_day: "2026-09-26" }),
      item({ id: "c", digest_day: "2026-09-24" }),
    ]);
    expect(sections.map((s) => [s.digestDay, s.items.map((i) => i.id)])).toEqual([
      ["2026-09-26", ["a", "b"]],
      ["2026-09-24", ["c"]],
    ]);
  });

  it("is empty for no Items", () => {
    expect(groupByDigestDay([])).toEqual([]);
  });
});

describe("filters", () => {
  const items = [
    item({ id: "1", category: "AI/IT", source: "x" }),
    item({ id: "2", category: "AI/IT", source: "web" }),
    item({ id: "3", category: "Kuchnia", source: "web" }),
  ];

  it("narrows by Category and by Source, together", () => {
    expect(applyFilters(items, {}).map((i) => i.id)).toEqual(["1", "2", "3"]);
    expect(applyFilters(items, { category: "AI/IT" }).map((i) => i.id)).toEqual(["1", "2"]);
    expect(applyFilters(items, { source: "web" }).map((i) => i.id)).toEqual(["2", "3"]);
    expect(applyFilters(items, { category: "AI/IT", source: "web" }).map((i) => i.id)).toEqual(["2"]);
  });

  it("counts Items per Category and per Source", () => {
    expect([...countBy(items, (i) => i.category)]).toEqual([
      ["AI/IT", 2],
      ["Kuchnia", 1],
    ]);
    expect([...countBy(items, (i) => i.source)]).toEqual([
      ["x", 1],
      ["web", 2],
    ]);
  });

  it("ignores unknown query values", () => {
    expect(parseBrowseFilters({ category: "Ogrodnictwo", source: "tiktok" })).toEqual({ category: undefined, source: undefined });
    expect(parseBrowseFilters({ category: "Zdrowie", source: "instagram" })).toEqual({ category: "Zdrowie", source: "instagram" });
  });
});
