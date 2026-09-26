import type { NextRequest } from "next/server";
import { ownerOr401 } from "@/panel/auth";
import { deleteItem, loadItem } from "@/panel/item-actions";

/** The Owner removes an Item; an Upload's file goes with it. Back to the list afterwards. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const owner = await ownerOr401(request);
  if (owner.refused) return owner.refused;

  const { id } = await params;
  const item = await loadItem(id);
  if (!item) return new Response("Not found", { status: 404 });

  await deleteItem(item);
  return owner.redirectTo("/");
}
