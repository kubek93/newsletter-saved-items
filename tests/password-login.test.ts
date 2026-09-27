import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/auth/login/route";
import { proxy } from "@/proxy";
import { formRequest, panelRequest, withPassword } from "./session";

const OWNER = process.env.OWNER_EMAIL!;
const PASSWORD = "tajne-haslo-do-testow-1";

describe("POST /auth/login", () => {
  it("signs the Owner in with email and password and opens the Panel", async () => {
    await withPassword(OWNER, PASSWORD);

    const res = await login(formRequest("/auth/login", { email: OWNER, password: PASSWORD }));

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${process.env.PANEL_URL}/`);
    const session = res.cookies.getAll().filter((cookie) => cookie.name.startsWith("sb-") && cookie.value !== "");
    expect(session.length).toBeGreaterThan(0);

    // The cookies it set are a working session: the proxy lets the browser through.
    const inside = await proxy(panelRequest("/", session.map(({ name, value }) => ({ name, value }))));
    expect(inside.status).toBe(200);
  });

  it("refuses a wrong password with the Polish message and no session", async () => {
    await withPassword(OWNER, PASSWORD);

    const res = await login(formRequest("/auth/login", { email: OWNER, password: "nie-to" }));

    expect(res.headers.get("location")).toBe(`${process.env.PANEL_URL}/login?error=1`);
    expect(res.cookies.getAll().filter((cookie) => cookie.value !== "")).toEqual([]);
  });

  it("refuses an empty form", async () => {
    const res = await login(formRequest("/auth/login", { email: "", password: "" }));
    expect(res.headers.get("location")).toBe(`${process.env.PANEL_URL}/login?error=1`);
  });

  it("refuses an account with a valid password that is not the Owner", async () => {
    await withPassword("stranger@example.com", PASSWORD);

    const res = await login(formRequest("/auth/login", { email: "stranger@example.com", password: PASSWORD }));

    expect(res.headers.get("location")).toBe(`${process.env.PANEL_URL}/login?refused=1`);
    expect(res.cookies.getAll().filter((cookie) => cookie.name.startsWith("sb-")).every((cookie) => cookie.value === "")).toBe(true);
  });
});
