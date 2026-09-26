import { readPage } from "./jina";
import type { Reader } from "./types";
import { isYouTubeUrl, readYouTube } from "./youtube";

/** The Web Source: YouTube links go to the model as video, every other page is read as text. */
export const readWeb: Reader = (item) => (isYouTubeUrl(item.url!) ? readYouTube(item) : readPage(item));
