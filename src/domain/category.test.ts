import { describe, expect, it } from "vitest";
import { CATEGORIES, toCategory } from "./category";

describe("toCategory", () => {
  it.each(CATEGORIES)("accepts %s", (category) => {
    expect(toCategory(category)).toBe(category);
  });

  it.each([
    ["an unknown label", "Sport"],
    ["a different case", "ai"],
    ["surrounding whitespace is not enough to rescue an unknown label", " Sport "],
    ["a non-string", 42],
    ["null", null],
    ["undefined", undefined],
  ])("falls back to Inne for %s", (_name, value) => {
    expect(toCategory(value)).toBe("Inne");
  });
});
