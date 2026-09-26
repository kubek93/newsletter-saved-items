import { describe, expect, it } from "vitest";
import { digestDayFor } from "./digest-day";

describe("digestDayFor", () => {
  it.each([
    // Summer time: Europe/Warsaw is UTC+2.
    ["midday in summer", "2026-07-10T10:00:00Z", "2026-07-10"],
    ["23:30 Warsaw in summer stays on that day", "2026-07-10T21:30:00Z", "2026-07-10"],
    ["00:30 Warsaw in summer belongs to the previous day", "2026-07-10T22:30:00Z", "2026-07-10"],
    ["02:59 Warsaw in summer belongs to the previous day", "2026-07-11T00:59:00Z", "2026-07-10"],
    ["03:00 Warsaw in summer starts the new day", "2026-07-11T01:00:00Z", "2026-07-11"],
    // Winter time: Europe/Warsaw is UTC+1.
    ["02:59 Warsaw in winter belongs to the previous day", "2026-01-11T01:59:00Z", "2026-01-10"],
    ["03:00 Warsaw in winter starts the new day", "2026-01-11T02:00:00Z", "2026-01-11"],
    // Day boundary of the UTC date differs from Warsaw's.
    ["late UTC evening is already the next Warsaw day", "2026-01-10T23:30:00Z", "2026-01-10"],
    ["year boundary", "2027-01-01T01:30:00Z", "2026-12-31"],
  ])("%s", (_name, iso, expected) => {
    expect(digestDayFor(new Date(iso))).toBe(expected);
  });
});
