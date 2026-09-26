import { requireOwner } from "@/panel/auth";
import { RecipientList } from "@/panel/RecipientList";
import { isAddOutcome, listRecipients } from "@/panel/recipients";

export default async function RecipientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOwner();
  const params = await searchParams;
  const outcome = isAddOutcome(params.outcome) ? params.outcome : null;
  const attempted = typeof params.email === "string" ? params.email : undefined;
  return (
    <main>
      <RecipientList recipients={await listRecipients()} outcome={outcome} attempted={attempted} />
    </main>
  );
}
