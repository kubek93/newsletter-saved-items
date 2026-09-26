import { describe, expect, it } from "vitest";
import { digestDayEndedBefore, digestDayFor, formatDigestDay, hourInWarsaw } from "./digest-day";

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

describe("digestDayEndedBefore", () => {
  it.each([
    ["07:00 Warsaw in summer sends yesterday", "2026-07-10T05:00:00Z", "2026-07-09"],
    ["07:00 Warsaw in winter sends yesterday", "2026-01-10T06:00:00Z", "2026-01-09"],
    ["the first of the month goes back to the previous month", "2026-10-01T05:00:00Z", "2026-09-30"],
    ["New Year's morning sends the last day of the old year", "2027-01-01T06:00:00Z", "2026-12-31"],
    ["before 03:00 the current Digest Day has not ended yet, so two days back", "2026-07-10T00:30:00Z", "2026-07-08"],
  ])("%s", (_name, iso, expected) => {
    expect(digestDayEndedBefore(new Date(iso))).toBe(expected);
  });
});

describe("hourInWarsaw", () => {
  it.each([
    ["04:00 UTC in summer is 06:00", "2026-07-10T04:00:00Z", 6],
    ["05:00 UTC in winter is 06:00", "2026-01-10T05:00:00Z", 6],
    ["23:30 UTC in summer is 01:00 next day", "2026-07-10T23:30:00Z", 1],
  ])("%s", (_name, iso, expected) => {
    expect(hourInWarsaw(new Date(iso))).toBe(expected);
  });
});

describe("formatDigestDay", () => {
  it("reads as a Polish date", () => {
    expect(formatDigestDay("2026-09-25")).toBe("25 września 2026");
    expect(formatDigestDay("2026-01-01")).toBe("1 stycznia 2026");
  });
});
