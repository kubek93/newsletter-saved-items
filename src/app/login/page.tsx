const MESSAGES: Record<string, string> = {
  refused: "To konto nie ma dostępu do Panelu.",
  error: "Nieprawidłowy e-mail lub hasło.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const message = params.refused ? MESSAGES.refused : params.error ? MESSAGES.error : null;
  return (
    <main className="login">
      <h1>Zapisane</h1>
      <p>Panel właściciela.</p>
      {message && <p className="notice">{message}</p>}
      <form method="post" action="/auth/login" className="login-form">
        <label>
          E-mail
          <input type="email" name="email" required autoComplete="username" />
        </label>
        <label>
          Hasło
          <input type="password" name="password" required autoComplete="current-password" />
        </label>
        <button type="submit">Zaloguj</button>
      </form>
    </main>
  );
}
