import { describe, expect, it } from "vitest";
import { embedFor, youtubeId } from "./embed";

describe("youtubeId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=jNQXAC9IVRw", "jNQXAC9IVRw"],
    ["https://youtu.be/jNQXAC9IVRw?si=abc", "jNQXAC9IVRw"],
    ["https://www.youtube.com/shorts/abc123", "abc123"],
    ["https://www.youtube.com/@channel", null],
    ["https://example.com/watch?v=x", null],
  ])("%s", (url, expected) => {
    expect(youtubeId(url)).toBe(expected);
  });
});

describe("embedFor", () => {
  it("picks the platform embed for X, Instagram and YouTube", () => {
    expect(embedFor({ source: "x", url: "https://x.com/a/status/1" })).toEqual({ kind: "x", url: "https://x.com/a/status/1" });
    expect(embedFor({ source: "instagram", url: "https://www.instagram.com/reel/abc/" })).toEqual({
      kind: "instagram",
      url: "https://www.instagram.com/reel/abc/",
    });
    expect(embedFor({ source: "web", url: "https://youtu.be/jNQXAC9IVRw" })).toEqual({ kind: "youtube", videoId: "jNQXAC9IVRw" });
  });

  it("makes a link card for any other page", () => {
    expect(embedFor({ source: "web", url: "https://www.example.com/a/b" })).toEqual({
      kind: "link",
      url: "https://www.example.com/a/b",
      host: "example.com",
    });
  });

  it("shows an Upload as its file, or nothing without a signed URL", () => {
    expect(embedFor({ source: "upload", url: null }, { url: "https://s/x.jpg?token=1", video: false })).toEqual({ kind: "image", url: "https://s/x.jpg?token=1" });
    expect(embedFor({ source: "upload", url: null }, { url: "https://s/x.mp4?token=1", video: true })).toEqual({ kind: "video", url: "https://s/x.mp4?token=1" });
    expect(embedFor({ source: "upload", url: null })).toBeNull();
  });
});
