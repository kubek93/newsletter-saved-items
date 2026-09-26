import type { NextRequest } from "next/server";
import { ownerOr401 } from "@/panel/auth";
import { addRecipient } from "@/panel/recipients";

/** The Owner adds an address from the Recipients page; the page then says what happened. */
export async function POST(request: NextRequest) {
  const owner = await ownerOr401(request);
  if (owner.refused) return owner.refused;

  const email = (await request.formData()).get("email");
  const outcome = await addRecipient(typeof email === "string" ? email : "");
  const query = new URLSearchParams({ outcome });
  if (outcome !== "added" && typeof email === "string") query.set("email", email);
  return owner.redirectTo(`/recipients?${query}`);
}
