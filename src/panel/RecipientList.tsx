import Link from "next/link";
import type { Recipient } from "@/domain/recipient";
import type { AddOutcome } from "./recipients";

export const OUTCOME_MESSAGES: Record<AddOutcome, string> = {
  added: "Dodano. Następny Digest trafi także na ten adres.",
  malformed: "To nie wygląda na adres e-mail.",
  duplicate: "Ten adres już dostaje Digest.",
};

const dateFormat = new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", day: "numeric", month: "long", year: "numeric" });

export function RecipientList({ recipients, outcome, attempted }: { recipients: Recipient[]; outcome: AddOutcome | null; attempted?: string }) {
  return (
    <section>
      <p>
        <Link href="/">← Lista</Link>
      </p>
      <h2>Odbiorcy Digestu</h2>

      <form method="post" action="/recipients/add" className="filters">
        <label>
          Adres e-mail
          <input type="email" name="email" required defaultValue={outcome && outcome !== "added" ? attempted : ""} />
        </label>
        <button type="submit">Dodaj</button>
      </form>
      {outcome && <p className={outcome === "added" ? "notice" : "failed"}>{OUTCOME_MESSAGES[outcome]}</p>}

      {recipients.length === 0 ? (
        <p className="empty">Nikt jeszcze nie dostaje Digestu.</p>
      ) : (
        <table className="items">
          <thead>
            <tr>
              <th>Adres</th>
              <th>Dodano</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {recipients.map((recipient) => (
              <tr key={recipient.id}>
                <td>{recipient.email}</td>
                <td>
                  <time dateTime={recipient.created_at}>{dateFormat.format(new Date(recipient.created_at))}</time>
                </td>
                <td>
                  <form method="post" action={`/recipients/${recipient.id}/delete`} className="inline">
                    <button type="submit">Usuń</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
