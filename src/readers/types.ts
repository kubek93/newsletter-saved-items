import type { Item } from "@/domain/item";

/** One piece of an Item's content as the model will receive it. */
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; url: string }
  /** A YouTube link: the only kind of video the model takes by URL. */
  | { type: "youtube"; url: string }
  /** Any other video, already downloaded, sent inline (ADR 0005). */
  | { type: "video"; bytes: Uint8Array; mimeType: string };

/** Given an Item, return its readable content parts. Throws when the Source cannot be read. */
export type Reader = (item: Item) => Promise<ContentPart[]>;
