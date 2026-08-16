import "dotenv/config";
import prismaClient from "../index";

type TableRow = {
	table_name: string;
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error("DATABASE_URL is not set");
}

const target = new URL(connectionString);
console.log(`Connecting with Prisma to ${target.hostname}/${target.pathname.slice(1)} ...`);

try {
	await prismaClient.$queryRaw`SELECT 1`;

	const tables = await prismaClient.$queryRaw<TableRow[]>`
		SELECT table_name::text AS table_name
		FROM information_schema.tables
		WHERE table_schema = 'public'
		ORDER BY table_name
	`;

	console.log(`Connected successfully. Found ${tables.length} public tables:`);
	for (const { table_name: tableName } of tables) {
		console.log(`- ${tableName}`);
	}
} catch (error) {
	console.error("Prisma connection check failed:");
	console.error(error);
	process.exitCode = 1;
} finally {
	await prismaClient.$disconnect();
}
