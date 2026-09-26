import { requireOwner } from "@/panel/auth";
import { RecipientList } from "@/panel/RecipientList";
import { listRecipients, type AddOutcome } from "@/panel/recipients";

const OUTCOMES: AddOutcome[] = ["added", "malformed", "duplicate"];

export default async function RecipientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOwner();
  const params = await searchParams;
  const outcome = OUTCOMES.find((candidate) => candidate === params.outcome) ?? null;
  const attempted = typeof params.email === "string" ? params.email : undefined;
  return (
    <main>
      <RecipientList recipients={await listRecipients()} outcome={outcome} attempted={attempted} />
    </main>
  );
}
