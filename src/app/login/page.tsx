const MESSAGES: Record<string, string> = {
  refused: "To konto Google nie ma dostępu do Panelu.",
  error: "Logowanie się nie powiodło. Spróbuj jeszcze raz.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const message = params.refused ? MESSAGES.refused : params.error ? MESSAGES.error : null;
  return (
    <main className="login">
      <h1>Zapisane</h1>
      <p>Panel właściciela. Zaloguj się kontem Google, które ma dostęp.</p>
      {message && <p className="notice">{message}</p>}
      <form method="post" action="/auth/login">
        <button type="submit">Zaloguj przez Google</button>
      </form>
    </main>
  );
}
