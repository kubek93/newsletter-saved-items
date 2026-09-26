import { describe, expect, it } from "vitest";
import { parseFilters } from "./items";

describe("parseFilters", () => {
  it.each([
    ["nothing", {}, {}],
    ["a Category", { category: "Ceramika" }, { category: "Ceramika" }],
    ["an unknown Category is ignored", { category: "Sport" }, {}],
    ["an empty Category means all", { category: "" }, {}],
    ["a date range", { from: "2026-09-01", to: "2026-09-30" }, { from: "2026-09-01", to: "2026-09-30" }],
    ["a malformed date is ignored", { from: "wczoraj", to: "2026-9-1" }, {}],
    ["a repeated parameter takes the first value", { category: ["AI", "IT"] }, { category: "AI" }],
  ])("%s", (_name, params, expected) => {
    expect(parseFilters(params)).toEqual({ category: undefined, from: undefined, to: undefined, ...expected });
  });
});
