import { notFound } from "next/navigation";
import { requireOwner } from "@/panel/auth";
import { ItemDetail } from "@/panel/ItemDetail";
import { loadItem, mediaFor } from "@/panel/items";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  const item = await loadItem(id);
  if (!item) notFound();
  return (
    <main>
      <ItemDetail item={item} media={await mediaFor(item)} />
    </main>
  );
}
