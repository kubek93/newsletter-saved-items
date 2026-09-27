/** The closed Category list. Domain vocabulary, not configuration: see CONTEXT.md. */
export const CATEGORIES = [
  "AI",
  "IT",
  "Pomysły na produkty",
  "Produkty",
  "Ceramika",
  "Zdrowie",
  "Siłownia",
  "Jedzenie",
  "Polityka",
  "Finanse",
  "Inne",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** The same list as people expect to find it in a select or a filter: Polish alphabetical order. */
export const CATEGORIES_ALPHABETICAL: readonly Category[] = [...CATEGORIES].sort((a, b) => a.localeCompare(b, "pl"));

export function isCategory(value: unknown): value is Category {
  return (CATEGORIES as readonly unknown[]).includes(value);
}

/** The value as a Category, or "Inne" when it is not on the list. */
export function toCategory(value: unknown): Category {
  return isCategory(value) ? value : "Inne";
}
