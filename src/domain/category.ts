/** The closed Category list. Domain vocabulary, not configuration: see CONTEXT.md. */
export const CATEGORIES = [
  "AI",
  "IT",
  "Pomysły na produkty",
  "Ceramika",
  "Zdrowie",
  "Siłownia",
  "Jedzenie",
  "Inne",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** The value as a Category, or "Inne" when it is not one of the eight. */
export function toCategory(value: unknown): Category {
  return (CATEGORIES as readonly unknown[]).includes(value) ? (value as Category) : "Inne";
}
