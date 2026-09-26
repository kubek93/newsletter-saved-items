import Link from "next/link";
import { CATEGORIES } from "@/domain/category";
import type { Item, Source, Status } from "@/domain/item";
import type { ItemFilters } from "./items";

export const SOURCE_LABELS: Record<Source, string> = { x: "X", instagram: "Instagram", web: "Web", upload: "Plik" };
export const STATUS_LABELS: Record<Status, string> = { pending: "Oczekuje", done: "Gotowe", failed: "Nie odczytano" };

const dateFormat = new Intl.DateTimeFormat("pl-PL", {
  timeZone: "Europe/Warsaw",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** What the Owner sees for an Item before it has a title: the link itself, or the file name. */
export function itemLabel(item: Item): string {
  return item.title ?? item.url ?? item.storage_path?.slice(item.storage_path.lastIndexOf("/") + 1) ?? item.id;
}

export function ItemList({ items, filters }: { items: Item[]; filters: ItemFilters }) {
  return (
    <section>
      <form method="get" action="/" className="filters">
        <label>
          Kategoria
          <select name="category" defaultValue={filters.category ?? ""}>
            <option value="">Wszystkie</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label>
          Od
          <input type="date" name="from" defaultValue={filters.from ?? ""} />
        </label>
        <label>
          Do
          <input type="date" name="to" defaultValue={filters.to ?? ""} />
        </label>
        <button type="submit">Filtruj</button>
        <Link href="/">Wyczyść</Link>
      </form>

      {items.length === 0 ? (
        <p className="empty">Nic tu nie ma.</p>
      ) : (
        <table className="items">
          <thead>
            <tr>
              <th>Tytuł</th>
              <th>Źródło</th>
              <th>Stan</th>
              <th>Kategoria</th>
              <th>Zapisano</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={item.status}>
                <td>
                  <Link href={`/items/${item.id}`}>{itemLabel(item)}</Link>
                </td>
                <td>{SOURCE_LABELS[item.source]}</td>
                <td>{STATUS_LABELS[item.status]}</td>
                <td>{item.category ?? "–"}</td>
                <td>
                  <time dateTime={item.saved_at}>{dateFormat.format(new Date(item.saved_at))}</time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
