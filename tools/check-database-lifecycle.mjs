import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const databaseFile = "apps/platform/api/src/database/platform-database.ts";
const codelogicxDatabaseFile = "apps/codelogicx/api/src/database/codelogicx-database.ts";
const schemaFile = "apps/platform/api/src/database/schema.ts";
const addonDatabaseFile = "apps/platform/api/src/addons/addon-database.ts";
const addonHostFile = "apps/platform/api/src/addons/addon-host.ts";
const database = readFileSync(resolve(root, databaseFile), "utf8");
const codelogicxDatabase = readFileSync(resolve(root, codelogicxDatabaseFile), "utf8");
const schema = readFileSync(resolve(root, schemaFile), "utf8");
const addonDatabase = readFileSync(resolve(root, addonDatabaseFile), "utf8");
const addonHost = readFileSync(resolve(root, addonHostFile), "utf8");

assertOrdered(databaseFile, database, [
  "migrateRoleModule(db)",
  "migratePermissionModule(db)",
  "migrateUserModule(db)",
  "migrateUserRoleModule(db)",
  "migrateRolePermissionModule(db)",
  "migrateCodeLogicXDatabase(db as unknown as Kysely<CodeLogicXDatabase>)",
  "migrateCodeLogicXAddonDatabases(db as unknown as Kysely<BlogsDatabase>)"
]);
assertOrdered(databaseFile, database, [
  "seedRoleModule(db)",
  "seedPermissionModule(db)",
  "seedUserModule(db)",
  "seedUserRoleModule(db)",
  "seedRolePermissionModule(db)"
]);

assertOrdered(codelogicxDatabaseFile, codelogicxDatabase, [
  "migrate: migrateProjectManagerModule",
  "migrate: migrateTaskManagerModule",
  "migrate: migratePlanningModule",
  "migrate: migrateSyncModule"
]);
if (!codelogicxDatabase.includes("seeders: Object.freeze([])")) {
  throw new Error(`${codelogicxDatabaseFile}: CodeLogicX must not load JSON seed databases`);
}

const expectedTables = [
  "permissions",
  "role_permissions",
  "roles",
  "schema_migrations",
  "user_roles",
  "users"
];
const declaredTables = Array.from(
  schema.matchAll(/^  ([a-z_]+): [A-Za-z]+Table;$/gmu),
  (match) => match[1]
).sort();
if (declaredTables.join(",") !== expectedTables.join(",")) {
  throw new Error(`${schemaFile}: unexpected table ownership: ${declaredTables.join(", ")}`);
}
if (!database.includes("platformDatabaseName()")) {
  throw new Error(`${databaseFile}: single database selection is missing`);
}
assertOrdered(addonDatabaseFile, addonDatabase, [
  "migrateBlogsDatabase(database, runBlogMigrationBatch)",
  "runFileManagerMigrations(fileManagerMigrations)"
]);
if (addonHost.includes("migrateBlogsDatabase(")) {
  throw new Error(`${addonHostFile}: route registration must not own Blog migrations`);
}
if (!database.includes("await migratePlatformDatabase();\n  await seedPlatformDatabase();")) {
  throw new Error(`${databaseFile}: all migrations must complete before platform seeds`);
}

console.info(
  "Database lifecycle verified: Platform identity, CodeLogicX, Blog, File Manager, then seeds."
);

function assertOrdered(file, source, tokens) {
  let previous = -1;
  for (const token of tokens) {
    const index = source.indexOf(token, previous + 1);
    if (index < 0) throw new Error(`${file}: missing ${token}`);
    if (index <= previous) throw new Error(`${file}: out of order ${token}`);
    previous = index;
  }
}
