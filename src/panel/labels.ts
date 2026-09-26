import type { Item, Source, Status } from "@/domain/item";
import { uploadFilename } from "@/domain/upload-item";

/** Polish UI words for the domain's enums. */
export const SOURCE_LABELS: Record<Source, string> = { x: "X", instagram: "Instagram", web: "Web", upload: "Plik" };
export const STATUS_LABELS: Record<Status, string> = {
  pending: "Czeka na podsumowanie",
  done: "Gotowe",
  failed: "Nie odczytano",
};

/** What the Owner sees for an Item before it has a title: the link itself, or the file name. */
export function itemLabel(item: Item): string {
  return item.title ?? item.url ?? (item.storage_path ? uploadFilename(item.storage_path) : item.id);
}
