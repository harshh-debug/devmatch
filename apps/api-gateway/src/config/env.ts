const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const url = (name: string, fallback?: string): string => {
  const value = process.env[name]?.trim() || fallback;
  if (!value) throw new Error(`${name} is required`);
  try {
    new URL(value);
    return value;
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
};

const positiveInteger = (name: string, fallback: number): number => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
};

const nodeEnv = process.env.NODE_ENV ?? "development";
if (!["development", "test", "production"].includes(nodeEnv)) {
  throw new Error("NODE_ENV must be development, test, or production");
}

export const env = {
  NODE_ENV: nodeEnv as "development" | "test" | "production",
  API_GATEWAY_PORT: positiveInteger("API_GATEWAY_PORT", 3001),
  JWT_SECRET: required("JWT_SECRET"),
  ALLOWED_ORIGIN: url("ALLOWED_ORIGIN", "http://localhost:3000"),
  AUTH_SERVICE_URL: url("AUTH_SERVICE_URL"),
  USER_SERVICE_URL: url("USER_SERVICE_URL"),
  MATCH_SERVICE_URL: url("MATCH_SERVICE_URL"),
  CHAT_SERVICE_URL: url("CHAT_SERVICE_URL"),
  RATE_LIMIT_WINDOW_MS: positiveInteger("RATE_LIMIT_WINDOW_MS", 60_000),
  RATE_LIMIT_MAX_PER_IP: positiveInteger("RATE_LIMIT_MAX_PER_IP", 100),
};
