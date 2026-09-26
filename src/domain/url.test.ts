import { describe, expect, it } from "vitest";
import { normalizeUrl } from "./url";

describe("normalizeUrl", () => {
  it.each([
    ["lower-cases the host", "https://X.com/User/status/1", "https://x.com/User/status/1"],
    ["treats twitter.com as x.com", "https://twitter.com/user/status/1", "https://x.com/user/status/1"],
    ["treats www.twitter.com as x.com", "https://www.twitter.com/user/status/1", "https://x.com/user/status/1"],
    ["strips the X share parameters", "https://x.com/user/status/1?s=20&t=abc", "https://x.com/user/status/1"],
    ["strips igsh from Instagram", "https://www.instagram.com/p/abc123/?igsh=xyz", "https://www.instagram.com/p/abc123"],
    ["strips utm_* parameters", "https://example.com/a?utm_source=x&utm_medium=y&id=5", "https://example.com/a?id=5"],
    ["strips fbclid", "https://example.com/a?fbclid=123", "https://example.com/a"],
    ["strips the trailing slash", "https://example.com/path/", "https://example.com/path"],
    ["keeps the root path", "https://example.com/", "https://example.com/"],
    ["keeps non-tracking parameters in their order", "https://example.com/a?b=2&a=1", "https://example.com/a?b=2&a=1"],
    ["strips the fragment", "https://example.com/a#section", "https://example.com/a"],
    ["keeps youtu.be untouched apart from tracking", "https://youtu.be/abc?si=track", "https://youtu.be/abc"],
    ["keeps the YouTube video id parameter", "https://www.youtube.com/watch?v=abc&feature=share", "https://www.youtube.com/watch?v=abc"],
  ])("%s", (_name, input, expected) => {
    expect(normalizeUrl(input)).toBe(expected);
  });

  it("returns the same value for two variants of one link", () => {
    expect(normalizeUrl("https://twitter.com/a/status/1?s=20")).toBe(
      normalizeUrl("https://X.com/a/status/1/"),
    );
  });

  it("throws on something that is not an http(s) URL", () => {
    expect(() => normalizeUrl("not a url")).toThrow();
    expect(() => normalizeUrl("ftp://example.com/x")).toThrow();
  });
});
