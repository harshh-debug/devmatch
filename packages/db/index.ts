import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "./generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error("DATABASE_URL is not set");
}

const readPositiveInteger = (name: string, fallback: number) => {
	const value = process.env[name];
	if (!value) return fallback;

	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(`${name} must be a positive integer`);
	}

	return parsed;
};

// Every backend service is a separate process and therefore creates its own pool.
// Keep each pool deliberately small so local development and small Neon plans do
// not multiply pg's default of 10 connections by the number of services.
const adapter = new PrismaNeon({
	connectionString,
	max: readPositiveInteger("DATABASE_POOL_MAX", 2),
	connectionTimeoutMillis: readPositiveInteger("DATABASE_CONNECT_TIMEOUT_MS", 15_000),
	idleTimeoutMillis: readPositiveInteger("DATABASE_IDLE_TIMEOUT_MS", 30_000),
});
const prismaClient = new PrismaClient({ adapter });

export { prismaClient };
export default prismaClient;
export * from "./generated/prisma/client";
