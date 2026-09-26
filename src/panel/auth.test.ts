import { describe, expect, it } from "vitest";
import { accessFor, isOwnerEmail, loginPath } from "./owner";

const OWNER = "owner@example.com";

describe("isOwnerEmail", () => {
  it.each([
    ["the exact allowlisted address", "owner@example.com", true],
    ["a different case", "Owner@Example.com", true],
    ["surrounding whitespace", "  owner@example.com ", true],
    ["another address", "someone@example.com", false],
    ["a look-alike", "owner@example.com.evil.net", false],
    ["no address", null, false],
    ["an empty address", "", false],
  ])("%s", (_name, email, expected) => {
    expect(isOwnerEmail(email, OWNER)).toBe(expected);
  });
});

describe("accessFor", () => {
  it("is anonymous with nobody signed in, refused for a stranger, owner for the Owner", () => {
    expect(accessFor(null, OWNER)).toEqual({ access: "anonymous" });
    expect(accessFor({ email: "stranger@example.com" }, OWNER)).toEqual({ access: "refused" });
    expect(accessFor({ email: undefined }, OWNER)).toEqual({ access: "refused" });
    expect(accessFor({ email: OWNER }, OWNER)).toEqual({ access: "owner", email: OWNER });
  });
});

describe("loginPath", () => {
  it("carries the reason for landing on sign-in", () => {
    expect(loginPath()).toBe("/login");
    expect(loginPath("refused")).toBe("/login?refused=1");
    expect(loginPath("error")).toBe("/login?error=1");
  });
});
