/** The closed Category list. Domain vocabulary, not configuration: see CONTEXT.md. */
export const CATEGORIES = [
  "AI",
  "IT",
  "Pomysły na produkty",
  "Ceramika",
  "Zdrowie",
  "Siłownia",
  "Jedzenie",
  "Polityka",
  "Finanse",
  "Inne",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: unknown): value is Category {
  return (CATEGORIES as readonly unknown[]).includes(value);
}

/** The value as a Category, or "Inne" when it is not on the list. */
export function toCategory(value: unknown): Category {
  return isCategory(value) ? value : "Inne";
}
