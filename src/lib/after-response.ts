import { after } from "next/server";

const OUTSIDE_REQUEST_SCOPE = "E468";

/**
 * Runs `task` once the current response has been sent. Inside a Next request this is `after()`;
 * outside one (the job invoked from a script, a cron, or a test calling the handler directly) the task
 * simply starts now without being awaited.
 */
export function afterResponse(task: () => Promise<void>): void {
  const guarded = () => task().catch((error) => console.error("Background task failed", error));
  try {
    after(guarded);
  } catch (error) {
    if ((error as { __NEXT_ERROR_CODE?: string }).__NEXT_ERROR_CODE !== OUTSIDE_REQUEST_SCOPE) throw error;
    void guarded();
  }
}
