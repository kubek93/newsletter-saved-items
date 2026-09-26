import type { ContentPart, Reader } from "./types";

const FXTWITTER_API = "https://api.fxtwitter.com";

type FxTwitterResponse = {
  code: number;
  message: string;
  tweet: {
    text: string;
    author: { name: string; screen_name: string };
    media?: { all?: { type: "photo" | "video" | "gif"; url: string; thumbnail_url?: string }[] };
  } | null;
};

/**
 * Reads an X post through the FxTwitter public API: text, author and media. No auth.
 * A video is represented by its thumbnail for now; sending the file itself is a later step (ADR 0005).
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
  const attachments = media?.all ?? [];
  const hasVideo = attachments.some((attachment) => attachment.type !== "photo");
  const note = hasVideo ? "\n(post zawiera wideo; poniżej jego kadr)" : "";
  const parts: ContentPart[] = [{ type: "text", text: `@${author.screen_name} (${author.name}):\n${text}${note}` }];
  for (const attachment of attachments) {
    const url = attachment.type === "photo" ? attachment.url : attachment.thumbnail_url;
    if (url) parts.push({ type: "image", url });
  }
  return parts;
};
