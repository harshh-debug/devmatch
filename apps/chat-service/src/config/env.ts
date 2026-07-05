import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3005"),
  // `.min(1)` rejects empty strings so a misconfigured env fails at boot, not on the
  // first socket connect with a cryptic `secretOrPrivateKey must have a value` error.
  JWT_SECRET: z.string().min(1, "JWT_SECRET must not be empty"),
  KAFKA_BROKERS: z.string().default("localhost:9092"),
});

export const env = envSchema.parse(process.env);
