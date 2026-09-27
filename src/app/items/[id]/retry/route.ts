import type { NextRequest } from "next/server";
import { afterResponse } from "@/lib/after-response";
import { ownerOr401 } from "@/panel/auth";
import { loadItem, reopenItem } from "@/panel/items";
import { summarizeItem } from "@/summarize";

/** The Owner asks for the Summary to be written again, whatever the Item's state or attempt count. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const owner = await ownerOr401(request);
  if (owner.refused) return owner.refused;

  const { id } = await params;
  const item = await loadItem(id);
  if (!item) return new Response("Not found", { status: 404 });

  await reopenItem(id);
  afterResponse(() => summarizeItem(id));
  return owner.redirectTo(`/items/${id}`);
}
