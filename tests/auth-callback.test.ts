import { describe, expect, it, vi } from "vitest";

// Route handlers read the request's cookies through next/headers, which only exists inside a Next request.
// Give them an empty cookie jar instead.
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}));

const { GET: callback } = await import("@/app/auth/callback/route");

describe("GET /auth/callback", () => {
  it("sends the browser back to sign-in when Google returned no code", async () => {
    const res = await callback(new Request("http://localhost/auth/callback"));

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${process.env.PANEL_URL}/login?error=1`);
  });

  it("sends the browser back to sign-in when the code cannot be exchanged for a session", async () => {
    const res = await callback(new Request("http://localhost/auth/callback?code=not-a-real-code"));

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${process.env.PANEL_URL}/login?error=1`);
  });
});
