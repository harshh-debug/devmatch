import { describe, expect, test } from "bun:test";
import { deleteAccountSchema } from "./user.validators";

describe("deleteAccountSchema", () => {
  test("requires the exact destructive-action confirmation", () => {
    expect(deleteAccountSchema.safeParse({ confirmation: "DELETE" }).success).toBe(true);
    expect(deleteAccountSchema.safeParse({ confirmation: "delete" }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({}).success).toBe(false);
  });
});
