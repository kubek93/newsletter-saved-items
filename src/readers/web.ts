import { readPage } from "./firecrawl";
import type { Reader } from "./types";
import { isYouTubeVideoUrl, readYouTube } from "./youtube";

/** The YouTube Source: a video goes to the model as video; a channel or playlist is read as a page. */
export const readYouTubeSource: Reader = (item) => (isYouTubeVideoUrl(item.url!) ? readYouTube(item) : readPage(item));

/** Any Source that is just a page to read: Web, Facebook, Allegro, Amazon. */
export const readWeb: Reader = readPage;
