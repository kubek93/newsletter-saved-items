import type { ContentPart, Reader } from "./types";
import { downloadVideo } from "./video";

const FXTWITTER_API = "https://api.fxtwitter.com";

type FxTwitterResponse = {
  code: number;
  message: string;
  tweet: {
    text: string;
    author: { name: string; screen_name: string };
    media?: { all?: { type: "photo" | "video" | "gif"; url: string }[] };
  } | null;
};

/** Reads an X post through the FxTwitter public API: text, author, photos, and videos downloaded inline (ADR 0005). */
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
    parts.push(attachment.type === "photo" ? { type: "image", url: attachment.url } : await downloadVideo(attachment.url));
  }
  return parts;
};
