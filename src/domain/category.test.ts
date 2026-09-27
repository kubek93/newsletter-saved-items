import { describe, expect, it } from "vitest";
import { CATEGORIES, toCategory } from "./category";

describe("toCategory", () => {
  it.each(CATEGORIES)("accepts %s", (category) => {
    expect(toCategory(category)).toBe(category);
  });

  it.each([
    ["an unknown label", "Ogrodnictwo"],
    ["a different case", "ai"],
    ["surrounding whitespace is not enough to rescue an unknown label", " Ogrodnictwo "],
    ["a non-string", 42],
    ["null", null],
    ["undefined", undefined],
  ])("falls back to Inne for %s", (_name, value) => {
    expect(toCategory(value)).toBe("Inne");
  });
});
