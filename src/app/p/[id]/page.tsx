import { notFound } from "next/navigation";
import { loadPublicItem } from "@/public/browse";
import { embedFor } from "@/public/embed";
import { PublicItemView } from "@/public/PublicItemView";

/** Open to everyone: one Item with its Summary and its source, once the Summary exists. */
export default async function PublicItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadPublicItem(id);
  if (!loaded) notFound();
  const { item, media } = loaded;
  return (
    <main className="public">
      <PublicItemView item={item} embed={embedFor(item, media)} openUrl={item.url ?? media?.url ?? null} />
    </main>
  );
}
