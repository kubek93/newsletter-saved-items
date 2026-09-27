import Link from "next/link";
import { requireOwner } from "@/panel/auth";
import { ItemList } from "@/panel/ItemList";
import { listItems, parseFilters } from "@/panel/items";

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const email = await requireOwner();
  const filters = parseFilters(await searchParams);
  const items = await listItems(filters);
  return (
    <main>
      <header className="topbar">
        <h1>Zapisane</h1>
        <nav>
          <Link href="/">Strona publiczna</Link> <Link href="/recipients">Odbiorcy</Link>
        </nav>
        <form method="post" action="/auth/logout">
          <span>{email}</span> <button type="submit">Wyloguj</button>
        </form>
      </header>
      <ItemList items={items} filters={filters} />
    </main>
  );
}
