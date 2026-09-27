import Link from "next/link";
import { CATEGORIES_ALPHABETICAL } from "@/domain/category";
import { formatDigestDay } from "@/domain/digest-day";
import { CATEGORY_ICONS, SOURCE_ICONS } from "@/domain/icons";
import { SOURCE_LABELS, SOURCES_BY_LABEL } from "@/panel/labels";
import { applyFilters, countBy, groupByDigestDay, readingMinutes, type BrowseFilters, type PublicItem } from "./browse";

function href(filters: BrowseFilters): string {
  const query = new URLSearchParams();
  if (filters.category) query.set("category", filters.category);
  if (filters.source) query.set("source", filters.source);
  const string = query.toString();
  return string ? `/?${string}` : "/";
}

function FilterList<K extends string>({
  title,
  values,
  counts,
  selected,
  label,
  hrefFor,
}: {
  title: string;
  values: readonly K[];
  counts: Map<K, number>;
  selected: K | undefined;
  label: (value: K) => string;
  hrefFor: (value: K | undefined) => string;
}) {
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  return (
    <nav className="filter-list" aria-label={title}>
      <h2>{title}</h2>
      <ul>
        <li className={selected ? "" : "active"}>
          <Link href={hrefFor(undefined)}>
            <span>Wszystkie</span>
            <span className="count">{total}</span>
          </Link>
        </li>
        {values.map((value) => (
          <li key={value} className={selected === value ? "active" : ""}>
            <Link href={hrefFor(value)}>
              <span>{label(value)}</span>
              <span className="count">{counts.get(value) ?? 0}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Tile({ item }: { item: PublicItem }) {
  const category = item.category ?? "Inne";
  return (
    <article className="tile">
      <Link href={`/p/${item.id}`}>
        <h3>{item.title}</h3>
        {item.recap && <p className="tagline">{item.recap}</p>}
        <p className="meta">
          <span>
            {SOURCE_ICONS[item.source]} {SOURCE_LABELS[item.source]}
          </span>
          <span>
            {CATEGORY_ICONS[category]} {category}
          </span>
          <span>{readingMinutes(item)} min czytania</span>
        </p>
      </Link>
    </article>
  );
}

/** The public page: every Item with a Summary, in sections per Digest Day, narrowed by Category and Source. */
export function Browse({ items, filters }: { items: PublicItem[]; filters: BrowseFilters }) {
  const shown = applyFilters(items, filters);
  const sections = groupByDigestDay(shown);
  const active = [filters.category, filters.source && SOURCE_LABELS[filters.source]].filter(Boolean).join(" · ");
  return (
    <div className="browse">
      {/* On a phone the filters are folded behind this label; on a wide screen they are always shown. */}
      <input type="checkbox" id="filters-toggle" className="filters-toggle" />
      <label htmlFor="filters-toggle" className="filters-label">
        Filtry{active ? `: ${active}` : ""}
      </label>
      <aside className="filters-panel">
        <FilterList
          title="Kategorie"
          values={CATEGORIES_ALPHABETICAL}
          counts={countBy(applyFilters(items, { source: filters.source }), (item) => item.category)}
          selected={filters.category}
          label={(category) => `${CATEGORY_ICONS[category]} ${category}`}
          hrefFor={(category) => href({ ...filters, category })}
        />
        <FilterList
          title="Źródła"
          values={SOURCES_BY_LABEL}
          counts={countBy(applyFilters(items, { category: filters.category }), (item) => item.source)}
          selected={filters.source}
          label={(source) => `${SOURCE_ICONS[source]} ${SOURCE_LABELS[source]}`}
          hrefFor={(source) => href({ ...filters, source })}
        />
      </aside>
      <section className="feed">
        {sections.length === 0 && <p className="empty">Nic tu jeszcze nie ma.</p>}
        {sections.map((section) => (
          <section key={section.digestDay} className="day">
            <h2>{formatDigestDay(section.digestDay).toUpperCase()}</h2>
            {section.items.map((item) => (
              <Tile key={item.id} item={item} />
            ))}
          </section>
        ))}
      </section>
    </div>
  );
}
