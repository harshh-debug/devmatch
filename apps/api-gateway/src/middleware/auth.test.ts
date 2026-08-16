import { beforeAll, describe, expect, test } from "bun:test";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

const secret = "test-only-jwt-secret";
let verifyJWT: typeof import("./auth").verifyJWT;

beforeAll(async () => {
  process.env.JWT_SECRET = secret;
  ({ verifyJWT } = await import("./auth"));
});

function responseRecorder() {
  const result = { status: 200, payload: undefined as unknown };
  const response = {
    status(code: number) {
      result.status = code;
      return response;
    },
    json(payload: unknown) {
      result.payload = payload;
      return response;
    },
  } as unknown as Response;
  return { response, result };
}

describe("verifyJWT", () => {
  test("rejects requests without a bearer token and removes spoofed identity headers", () => {
    const request = {
      headers: {
        "x-user-id": "spoofed",
        "x-user-email": "spoofed@example.com",
        "x-user-username": "spoofed",
      },
    } as unknown as Request;
    const { response, result } = responseRecorder();

    verifyJWT(request, response, (() => undefined) as NextFunction);

    expect(result).toEqual({ status: 401, payload: { error: "No token" } });
    expect(request.headers["x-user-id"]).toBeUndefined();
  });

  test("rebuilds trusted identity headers from a valid token", () => {
    const token = jwt.sign({ id: "user-1", email: "dev@example.com", username: "dev" }, secret);
    const request = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
    const { response } = responseRecorder();
    let nextCalled = false;

    verifyJWT(request, response, (() => { nextCalled = true; }) as NextFunction);

    expect(nextCalled).toBe(true);
    expect(request.user).toEqual({ id: "user-1", email: "dev@example.com", username: "dev" });
    expect(request.headers["x-user-id"]).toBe("user-1");
  });
});
