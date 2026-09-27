import Link from "next/link";
import { CATEGORIES_ALPHABETICAL } from "@/domain/category";
import type { Source } from "@/domain/item";
import type { Item } from "@/domain/item";
import type { ItemFilters } from "./items";
import { itemLabel, SOURCE_LABELS, STATUS_LABELS } from "./labels";

const dateFormat = new Intl.DateTimeFormat("pl-PL", {
  timeZone: "Europe/Warsaw",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function ItemList({ items, filters }: { items: Item[]; filters: ItemFilters }) {
  return (
    <section>
      <form method="get" action="/panel" className="filters">
        <label>
          Kategoria
          <select name="category" defaultValue={filters.category ?? ""}>
            <option value="">Wszystkie</option>
            {CATEGORIES_ALPHABETICAL.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label>
          Źródło
          <select name="source" defaultValue={filters.source ?? ""}>
            <option value="">Wszystkie</option>
            {(Object.keys(SOURCE_LABELS) as Source[]).map((source) => (
              <option key={source} value={source}>
                {SOURCE_LABELS[source]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Digest od
          <input type="date" name="from" defaultValue={filters.from ?? ""} />
        </label>
        <label>
          Digest do
          <input type="date" name="to" defaultValue={filters.to ?? ""} />
        </label>
        <button type="submit">Filtruj</button>
        <Link href="/panel">Wyczyść</Link>
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
