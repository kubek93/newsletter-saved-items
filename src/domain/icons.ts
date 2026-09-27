import type { Category } from "./category";
import type { Source } from "./item";

/** One glyph per Category and per Source, shown next to their names everywhere people browse. */
export const CATEGORY_ICONS: Record<Category, string> = {
  AI: "🤖",
  IT: "💻",
  "Pomysły na produkty": "💡",
  Produkty: "🛒",
  Ceramika: "🏺",
  Zdrowie: "🩺",
  Siłownia: "🏋️",
  Jedzenie: "🍜",
  Polityka: "🏛️",
  Finanse: "💰",
  Memy: "😂",
  Inne: "📌",
};

export const SOURCE_ICONS: Record<Source, string> = {
  x: "𝕏",
  instagram: "📷",
  youtube: "▶️",
  facebook: "📘",
  allegro: "🛍️",
  amazon: "📦",
  web: "🌐",
  upload: "📁",
};
