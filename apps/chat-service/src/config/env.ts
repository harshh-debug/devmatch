import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3004"),
  JWT_SECRET: z.string(),
  KAFKA_BROKERS: z.string().default("localhost:9092"),
});

export const env = envSchema.parse(process.env);