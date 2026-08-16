import { describe, expect, test } from "bun:test";
import { TOPICS } from "./index";

describe("Kafka topic contract", () => {
  test("includes the account-deletion invalidation event", () => {
    expect(TOPICS.USER_DELETED).toBe("user.deleted");
  });
});
