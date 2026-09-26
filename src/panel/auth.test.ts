import { describe, expect, it } from "vitest";
import { accessFor, isOwner } from "./auth";

describe("isOwner", () => {
  it.each([
    ["the exact allowlisted address", "owner@example.com", true],
    ["a different case", "Owner@Example.com", true],
    ["surrounding whitespace", "  owner@example.com ", true],
    ["another address", "someone@example.com", false],
    ["a look-alike", "owner@example.com.evil.net", false],
    ["no address", null, false],
    ["an empty address", "", false],
  ])("%s", (_name, email, expected) => {
    expect(isOwner(email)).toBe(expected);
  });
});

describe("accessFor", () => {
  it("is anonymous without a user, refused for a stranger, owner for the Owner", () => {
    expect(accessFor(null)).toBe("anonymous");
    expect(accessFor({ email: "stranger@example.com" })).toBe("refused");
    expect(accessFor({ email: undefined })).toBe("refused");
    expect(accessFor({ email: "owner@example.com" })).toBe("owner");
  });
});
