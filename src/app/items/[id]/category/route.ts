import type { NextRequest } from "next/server";
import { isCategory } from "@/domain/category";
import { ownerOr401 } from "@/panel/auth";
import { changeCategory } from "@/panel/items";

/** The Owner picks a Category from the form on the Item page. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const owner = await ownerOr401(request);
  if (owner.refused) return owner.refused;

  const category = (await request.formData()).get("category");
  if (!isCategory(category)) return new Response("Unknown Category", { status: 400 });

  const { id } = await params;
  if (!(await changeCategory(id, category))) return new Response("Not found", { status: 404 });
  return owner.redirectTo(`/items/${id}`);
}
