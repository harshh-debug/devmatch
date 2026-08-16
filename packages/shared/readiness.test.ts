import { describe, expect, test } from "bun:test";
import { retryUntilReady } from "./readiness";

describe("retryUntilReady", () => {
  test("retries dependency checks until they succeed", async () => {
    let attempts = 0;

    const ready = await retryUntilReady(
      "test dependency",
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error("not ready");
      },
      { shouldStop: () => false, initialDelayMs: 1, maxDelayMs: 1 },
    );

    expect(ready).toBe(true);
    expect(attempts).toBe(3);
  });

  test("does not run when shutdown has already started", async () => {
    let called = false;

    const ready = await retryUntilReady(
      "test dependency",
      async () => {
        called = true;
      },
      { shouldStop: () => true, initialDelayMs: 1, maxDelayMs: 1 },
    );

    expect(ready).toBe(false);
    expect(called).toBe(false);
  });
});
