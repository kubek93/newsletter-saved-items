import { describe, expect, it } from "vitest";
import { GET as callback } from "@/app/auth/callback/route";
import { POST as logout } from "@/app/auth/logout/route";
import { proxy } from "@/proxy";
import { panelRequest, sessionCookiesFor } from "./session";

const OWNER = process.env.OWNER_EMAIL!;

describe("the Panel's front door (proxy)", () => {
  it("sends an anonymous visitor to sign-in", async () => {
    const res = await proxy(panelRequest("/panel"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("lets an anonymous visitor see the public page, the sign-in page and the auth routes", async () => {
    expect((await proxy(panelRequest("/"))).headers.get("location")).toBeNull();
    expect((await proxy(panelRequest("/?category=AI"))).headers.get("location")).toBeNull();
    expect((await proxy(panelRequest("/login"))).headers.get("location")).toBeNull();
    expect((await proxy(panelRequest("/auth/callback?code=x"))).headers.get("location")).toBeNull();
  });

  it("lets the Owner through", async () => {
    const res = await proxy(panelRequest("/panel?category=AI", await sessionCookiesFor(OWNER)));

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("refuses any other Google account: signed out and told why, in Polish terms", async () => {
    const res = await proxy(panelRequest("/panel", await sessionCookiesFor("stranger@example.com")));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?refused=1");
    const cleared = res.cookies.getAll().filter((cookie) => cookie.name.startsWith("sb-"));
    expect(cleared.length).toBeGreaterThan(0);
    expect(cleared.every((cookie) => cookie.value === "")).toBe(true);
  });

  it("refuses a stranger on every page, not only the list", async () => {
    const res = await proxy(panelRequest("/items/some-id", await sessionCookiesFor("stranger@example.com")));
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?refused=1");
  });
});

describe("GET /auth/callback", () => {
  it("sends the browser back to sign-in when Google returned no code", async () => {
    const res = await callback(panelRequest("/auth/callback"));

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${process.env.PANEL_URL}/login?error=1`);
  });

  it("sends the browser back to sign-in when the code cannot be exchanged for a session", async () => {
    const res = await callback(panelRequest("/auth/callback?code=not-a-real-code"));

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${process.env.PANEL_URL}/login?error=1`);
  });
});

describe("POST /auth/logout", () => {
  it("clears the session and returns to sign-in", async () => {
    const res = await logout(panelRequest("/auth/logout", await sessionCookiesFor(OWNER)));

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${process.env.PANEL_URL}/login`);
    const cleared = res.cookies.getAll().filter((cookie) => cookie.name.startsWith("sb-"));
    expect(cleared.length).toBeGreaterThan(0);
    expect(cleared.every((cookie) => cookie.value === "")).toBe(true);
  });
});
