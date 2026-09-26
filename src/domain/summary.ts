import type { Category } from "./category";

/** What the model writes about an Item, always in Polish, plus the Category it picked. */
export type Summary = {
  title: string;
  description: string;
  recap: string;
  category: Category;
};
