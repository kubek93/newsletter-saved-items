import type { ContentPart, Reader } from "./types";

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

/** Reads an X post through the FxTwitter public API: text, author and media. No auth. */
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
  for (const entry of media?.all ?? []) {
    parts.push(entry.type === "photo" ? { type: "image", url: entry.url } : { type: "video", url: entry.url });
  }
  return parts;
};
