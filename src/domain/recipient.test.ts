import { describe, expect, it } from "vitest";
import { isEmail, normalizeEmail } from "./recipient";

describe("normalizeEmail", () => {
  it("trims and lower-cases", () => {
    expect(normalizeEmail("  Ania@Example.COM ")).toBe("ania@example.com");
  });
});

describe("isEmail", () => {
  it.each([
    ["a plain address", "ania@example.com", true],
    ["a subdomain and a plus tag", "ania+digest@mail.example.co.uk", true],
    ["no at sign", "ania.example.com", false],
    ["no domain", "ania@", false],
    ["no dot in the domain", "ania@example", false],
    ["spaces inside", "an ia@example.com", false],
    ["empty", "", false],
  ])("%s", (_name, value, expected) => {
    expect(isEmail(value)).toBe(expected);
  });
});
