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
    ["https://www.youtube.com/watch?v=abc", "youtube"],
    ["https://youtu.be/abc", "youtube"],
    ["https://www.youtube.com/@channel", "youtube"],
    ["https://www.facebook.com/someone/posts/123", "facebook"],
    ["https://m.facebook.com/story.php?id=1", "facebook"],
    ["https://fb.watch/abc/", "facebook"],
    ["https://allegro.pl/oferta/kubek-123", "allegro"],
    ["https://allegro.com/offer/1", "allegro"],
    ["https://www.amazon.com/dp/B000", "amazon"],
    ["https://www.amazon.pl/dp/B000", "amazon"],
    ["https://www.amazon.co.uk/dp/B000", "amazon"],
    ["https://amzn.eu/d/abc", "amazon"],
    ["https://example.com/article", "web"],
    ["https://notx.com/user/status/1", "web"],
    ["https://myamazon.com/x", "web"],
  ] as const)("%s → %s", (url, expected) => {
    expect(detectSource(normalizeUrl(url))).toBe(expected);
  });
});
