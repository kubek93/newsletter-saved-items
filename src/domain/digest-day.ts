const TIME_ZONE = "Europe/Warsaw";
const DAY_STARTS_AT_HOUR = 3;

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

/** The hour of the day (0 to 23) in Europe/Warsaw, where every schedule in this tool is expressed. */
export function hourInWarsaw(at: Date): number {
  return Number(formatter.formatToParts(at).find((part) => part.type === "hour")!.value);
}

/**
 * The Digest Day (YYYY-MM-DD) an Item saved at `savedAt` belongs to.
 * A Digest Day runs 03:00 to 03:00 Europe/Warsaw, so a save at 01:00 counts for the day that is ending.
 */
export function digestDayFor(savedAt: Date): string {
  const parts = Object.fromEntries(
    formatter.formatToParts(savedAt).map((part) => [part.type, part.value]),
  );
  const hour = Number(parts.hour);
  const localDate = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  if (hour < DAY_STARTS_AT_HOUR) {
    localDate.setUTCDate(localDate.getUTCDate() - 1);
  }
  return localDate.toISOString().slice(0, 10);
}
