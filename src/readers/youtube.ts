import type { Reader } from "./types";

/** True for a link to one YouTube video (watch, Shorts, youtu.be). Channels and playlists are ordinary pages. */
export function isYouTubeVideoUrl(url: string): boolean {
  const { hostname, pathname, searchParams } = new URL(url);
  if (hostname === "youtu.be") return pathname.length > 1;
  if (!/^(www\.|m\.)?youtube\.com$/.test(hostname)) return false;
  return (pathname === "/watch" && searchParams.has("v")) || pathname.startsWith("/shorts/");
}

/** A YouTube video is not fetched at all: the model watches it from the URL (Gemini via Google AI Studio). */
export const readYouTube: Reader = async (item) => {
  const url = item.url!;
  return [
    { type: "text", text: `Film z YouTube: ${url}` },
    { type: "video", url },
  ];
};
