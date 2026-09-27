import type { PublicItem } from "./browse";

export type Embed =
  | { kind: "youtube"; videoId: string }
  | { kind: "x"; url: string }
  | { kind: "instagram"; url: string }
  | { kind: "image"; url: string }
  | { kind: "video"; url: string }
  | { kind: "link"; url: string; host: string };

/** The id of a YouTube video link (watch, Shorts, youtu.be), or null for anything else. */
export function youtubeId(url: string): string | null {
  const { hostname, pathname, searchParams } = new URL(url);
  if (hostname === "youtu.be") return pathname.slice(1) || null;
  if (!/^(www\.|m\.)?youtube\.com$/.test(hostname)) return null;
  if (pathname === "/watch") return searchParams.get("v");
  const shorts = /^\/shorts\/([^/]+)/.exec(pathname);
  return shorts ? shorts[1] : null;
}

/**
 * How the source is shown on the Item's public page: the platform's own embed for X, Instagram and
 * YouTube, the file itself for an Upload (`mediaUrl` is its signed URL), a link card for any other page.
 */
export function embedFor(item: Pick<PublicItem, "source" | "url">, mediaUrl?: { url: string; video: boolean }): Embed | null {
  if (item.source === "upload") {
    return mediaUrl ? { kind: mediaUrl.video ? "video" : "image", url: mediaUrl.url } : null;
  }
  if (!item.url) return null;
  if (item.source === "x") return { kind: "x", url: item.url };
  if (item.source === "instagram") return { kind: "instagram", url: item.url };
  const videoId = youtubeId(item.url);
  if (videoId) return { kind: "youtube", videoId };
  return { kind: "link", url: item.url, host: new URL(item.url).hostname.replace(/^www\./, "") };
}
