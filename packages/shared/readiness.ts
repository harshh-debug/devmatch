type RetryOptions = {
  shouldStop: () => boolean;
  initialDelayMs?: number;
  maxDelayMs?: number;
};

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

/**
 * Retries startup dependency checks until they succeed or graceful shutdown begins.
 * Services stay alive and return 503 from /health/ready while this is in progress.
 */
export async function retryUntilReady(
  name: string,
  operation: () => Promise<void>,
  {
    shouldStop,
    initialDelayMs = 1_000,
    maxDelayMs = 15_000,
  }: RetryOptions,
): Promise<boolean> {
  let attempt = 0;

  while (!shouldStop()) {
    try {
      // The dependency client owns its timeout. Promise.race cannot cancel an
      // in-flight connection and would let retries accumulate hidden attempts.
      await operation();
      return true;
    } catch (error) {
      attempt += 1;
      const delayMs = Math.min(initialDelayMs * 2 ** (attempt - 1), maxDelayMs);
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[readiness] ${name} unavailable (attempt ${attempt}): ${message}. Retrying in ${delayMs}ms.`);
      await sleep(delayMs);
    }
  }

  return false;
}
