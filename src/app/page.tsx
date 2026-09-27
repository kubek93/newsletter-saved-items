import Link from "next/link";
import { Browse } from "@/public/BrowseView";
import { listPublicItems, parseBrowseFilters } from "@/public/browse";

/** Open to everyone: what was saved, once the Summary exists. */
export default async function PublicPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseBrowseFilters(await searchParams);
  const items = await listPublicItems();
  return (
    <main className="public">
      <header className="topbar">
        <h1>Zapisane</h1>
        <nav>
          <Link href="/panel">Panel</Link>
        </nav>
      </header>
      <Browse items={items} filters={filters} />
    </main>
  );
}
