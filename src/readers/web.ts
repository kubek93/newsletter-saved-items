import { readPage } from "./jina";
import type { Reader } from "./types";
import { isYouTubeVideoUrl, readYouTube } from "./youtube";

/** The Web Source: a YouTube video goes to the model as video, every other page is read as text. */
export const readWeb: Reader = (item) => (isYouTubeVideoUrl(item.url!) ? readYouTube(item) : readPage(item));
