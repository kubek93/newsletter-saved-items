import type { NextRequest } from "next/server";
import { ownerOr401 } from "@/panel/auth";
import { removeRecipient } from "@/panel/recipients";

/** The Owner removes an address; it gets no further Digest. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const owner = await ownerOr401(request);
  if (owner.refused) return owner.refused;

  const { id } = await params;
  if (!(await removeRecipient(id))) return new Response("Not found", { status: 404 });
  return owner.redirectTo("/recipients");
}
