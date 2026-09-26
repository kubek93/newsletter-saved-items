import { describe, expect, it } from "vitest";
import { detectSource } from "./source";
import { normalizeUrl } from "./url";

describe("detectSource", () => {
  it.each([
    ["https://x.com/user/status/1", "x"],
    ["https://twitter.com/user/status/1", "x"],
    ["https://mobile.twitter.com/user/status/1", "x"],
    ["https://www.instagram.com/p/abc/", "instagram"],
    ["https://instagram.com/reel/abc/", "instagram"],
    ["https://www.youtube.com/watch?v=abc", "web"],
    ["https://youtu.be/abc", "web"],
    ["https://example.com/article", "web"],
    ["https://notx.com/user/status/1", "web"],
  ] as const)("%s → %s", (url, expected) => {
    expect(detectSource(normalizeUrl(url))).toBe(expected);
  });
});
