import { SOURCES, type Item, type Source, type Status } from "@/domain/item";
import { uploadFilename } from "@/domain/upload-item";

/** Polish UI words for the domain's enums. */
export const SOURCE_LABELS: Record<Source, string> = {
  x: "X",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  allegro: "Allegro",
  amazon: "Amazon",
  web: "Web",
  upload: "Plik",
};
/** The Sources as people expect them in a select or a filter: by their label, Polish alphabetical order. */
export const SOURCES_BY_LABEL: readonly Source[] = [...SOURCES].sort((a, b) => SOURCE_LABELS[a].localeCompare(SOURCE_LABELS[b], "pl"));

export const STATUS_LABELS: Record<Status, string> = {
  pending: "Czeka na podsumowanie",
  done: "Gotowe",
  failed: "Nie odczytano",
};

/** What the Owner sees for an Item before it has a title: the link itself, or the file name. */
export function itemLabel(item: Item): string {
  return item.title ?? item.url ?? (item.storage_path ? uploadFilename(item.storage_path) : item.id);
}
