import type { Item } from "@/domain/item";

/** One piece of an Item's content as the model will receive it. */
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; url: string }
  | { type: "video"; url: string };

/** Given an Item, return its readable content parts. Throws when the Source cannot be read. */
export type Reader = (item: Item) => Promise<ContentPart[]>;
