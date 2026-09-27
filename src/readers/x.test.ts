import { describe, expect, it } from "vitest";
import { pickVideoUrl } from "./x";

const mp4 = (bitrate: number, url: string) => ({ bitrate, content_type: "video/mp4", url });
const hls = { bitrate: 0, content_type: "application/x-mpegURL", url: "https://cdn/pl.m3u8" };

describe("pickVideoUrl", () => {
  it.each([
    [
      "the best variant that fits: 164 s at 432 kb/s is 8.8 MB, at 832 kb/s already 17 MB",
      { url: "https://cdn/1080.mp4", duration: 163.8, variants: [hls, mp4(432000, "https://cdn/320.mp4"), mp4(832000, "https://cdn/540.mp4"), mp4(8768000, "https://cdn/1080.mp4")] },
      "https://cdn/320.mp4",
    ],
    [
      "the highest bitrate when everything fits",
      { url: "https://cdn/default.mp4", duration: 10, variants: [mp4(432000, "https://cdn/320.mp4"), mp4(8768000, "https://cdn/1080.mp4")] },
      "https://cdn/1080.mp4",
    ],
    [
      "the smallest variant when nothing fits, leaving the size check to the download",
      { url: "https://cdn/default.mp4", duration: 3600, variants: [mp4(832000, "https://cdn/540.mp4"), mp4(432000, "https://cdn/320.mp4")] },
      "https://cdn/320.mp4",
    ],
    ["the default address without variants", { url: "https://cdn/default.mp4", duration: 30, variants: [] }, "https://cdn/default.mp4"],
    ["the default address without a duration", { url: "https://cdn/default.mp4", variants: [mp4(432000, "https://cdn/320.mp4")] }, "https://cdn/default.mp4"],
    ["the default address when only a playlist is offered", { url: "https://cdn/default.mp4", duration: 30, variants: [hls] }, "https://cdn/default.mp4"],
  ])("picks %s", (_name, video, expected) => {
    expect(pickVideoUrl(video)).toBe(expected);
  });
});
