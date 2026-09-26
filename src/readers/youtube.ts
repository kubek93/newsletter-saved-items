import type { Reader } from "./types";

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);

export function isYouTubeUrl(url: string): boolean {
  return YOUTUBE_HOSTS.has(new URL(url).hostname);
}

/** A YouTube video is not fetched at all: the model watches it from the URL (Gemini via Google AI Studio). */
export const readYouTube: Reader = async (item) => {
  const url = item.url!;
  return [
    { type: "text", text: `Film z YouTube: ${url}` },
    { type: "video", url },
  ];
};
