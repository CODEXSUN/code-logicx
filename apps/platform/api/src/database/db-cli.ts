import { createConnection } from "mysql2/promise";
import { env } from "../env.js";
import {
  closePlatformDatabase,
  createPlatformDatabase,
  migratePlatformDatabase,
  resetPlatformDatabase,
  seedPlatformDatabase,
  platformDatabaseName
} from "./platform-database.js";
import { closeFileManagerDatabase } from "../addons/file-manager-host.js";

type DbCommand = "migrate" | "seed" | "drop" | "fresh" | "migrations:list";
const validCommands: DbCommand[] = ["migrate", "seed", "drop", "fresh", "migrations:list"];
const command = process.argv[2] as DbCommand | undefined;

async function main() {
  if (!command || !validCommands.includes(command)) {
    console.info("Usage: npm run db:migrate|db:seed|db:drop|dbmigrate:fresh|db:migrations:list");
    process.exitCode = 1;
    return;
  }

  try {
    if (command === "migrate") {
      await createPlatformDatabase();
      await migratePlatformDatabase();
    } else if (command === "seed") {
      await createPlatformDatabase();
      await migratePlatformDatabase();
      await seedPlatformDatabase();
    } else if (command === "drop" || command === "fresh") {
      await resetPlatformDatabase();
    } else {
      await listMigrations();
    }
    console.info(`[database] db:${command} completed for "${platformDatabaseName()}"`);
  } finally {
    await closeFileManagerDatabase();
    await closePlatformDatabase();
  }
}

async function listMigrations() {
  const connection = await createConnection({
    database: platformDatabaseName(),
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER,
    timezone: "Z"
  });
  try {
    const [applicationRows] = await connection.query(
      "SELECT package_id AS scope, name, applied_at, 'applied' AS status FROM schema_migrations WHERE package_id <> '@codexsun/blog:legacy' ORDER BY applied_at, id"
    );
    const [blogRows] = await connection.query(
      "SELECT scope, name, applied_at, status FROM blog_migration_schema ORDER BY id"
    );
    const [fileManagerRows] = await connection.query(
      "SELECT scope, name, applied_at, status FROM migration_schema WHERE scope='file-manager' ORDER BY id"
    );
    console.table([...(applicationRows as object[]), ...(blogRows as object[]), ...(fileManagerRows as object[])]);
  } finally {
    await connection.end();
  }
}

await main();
