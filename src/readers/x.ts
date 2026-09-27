import type { ContentPart, Reader } from "./types";
import { MAX_INLINE_VIDEO_BYTES, videoOrNote } from "./video";

const FXTWITTER_API = "https://api.fxtwitter.com";

type FxTwitterResponse = {
  code: number;
  message: string;
  tweet: {
    text: string;
    author: { name: string; screen_name: string };
    media?: { all?: FxMedia[] };
  } | null;
};

type FxVideo = {
  type: "video" | "gif";
  url: string;
  thumbnail_url?: string;
  duration?: number;
  variants?: { bitrate?: number; content_type?: string; url: string }[];
};
type FxMedia = { type: "photo"; url: string } | FxVideo;

/**
 * The address to download: the best-looking mp4 variant expected to fit inline (duration times bitrate),
 * else the smallest one, else the default address when FxTwitter gives no variants or no duration.
 */
export function pickVideoUrl(video: Pick<FxVideo, "url" | "duration" | "variants">): string {
  const mp4s = (video.variants ?? [])
    .filter((variant) => variant.content_type === "video/mp4" && (variant.bitrate ?? 0) > 0)
    .sort((a, b) => b.bitrate! - a.bitrate!);
  if (mp4s.length === 0 || !video.duration) return video.url;
  const fitting = mp4s.find((variant) => (video.duration! * variant.bitrate!) / 8 <= MAX_INLINE_VIDEO_BYTES);
  return (fitting ?? mp4s[mp4s.length - 1]).url;
}

/**
 * Reads an X post through the FxTwitter public API: text, author, photos, and videos downloaded inline (ADR 0005),
 * in the variant that fits; a video that still does not fit is skipped with a note.
 */
export const readX: Reader = async (item) => {
  const match = /\/status\/(\d+)/.exec(item.url ?? "");
  if (!match) throw new Error(`Not an X post URL: ${item.url}`);

  const res = await fetch(`${FXTWITTER_API}/status/${match[1]}`);
  const body = (await res.json().catch(() => null)) as FxTwitterResponse | null;
  if (!res.ok || !body?.tweet) {
    throw new Error(`FxTwitter ${res.status} ${body?.message ?? ""}`.trim());
  }

  const { text, author, media } = body.tweet;
  const parts: ContentPart[] = [{ type: "text", text: `@${author.screen_name} (${author.name}):\n${text}` }];
  for (const attachment of media?.all ?? []) {
    if (attachment.type === "photo") parts.push({ type: "image", url: attachment.url });
    else parts.push(...(await videoOrNote(pickVideoUrl(attachment), attachment.thumbnail_url)));
  }
  return parts;
};
