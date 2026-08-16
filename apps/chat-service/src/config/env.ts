import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3005),
  // `.min(1)` rejects empty strings so a misconfigured env fails at boot, not on the
  // first socket connect with a cryptic `secretOrPrivateKey must have a value` error.
  JWT_SECRET: z.string().min(1, "JWT_SECRET must not be empty"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL must not be empty"),
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL"),
  KAFKA_BROKERS: z.string().default("localhost:9092"),
  ALLOWED_ORIGIN: z.string().url().default("http://localhost:3000"),
});

export const env = envSchema.parse(process.env);

if (env.NODE_ENV === "production" && new URL(env.ALLOWED_ORIGIN).protocol !== "https:") {
  throw new Error("ALLOWED_ORIGIN must use HTTPS in production");
}
