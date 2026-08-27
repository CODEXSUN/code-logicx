import type { Kysely } from "kysely";
import { migrateBlogsDatabase, type BlogsDatabase } from "@codexsun/blog/api";
import { runBlogMigrationBatch } from "./blog-migration-runner.js";
import {
  fileManagerMigrations,
  runFileManagerMigrations
} from "./file-manager-host.js";

export const addonMigrationOrder = Object.freeze([
  "@codexsun/blog",
  "@codexsun/file-manager"
]);

export async function migrateCodeLogicXAddonDatabases(database: Kysely<BlogsDatabase>) {
  await migrateBlogsDatabase(database, runBlogMigrationBatch);
  await runFileManagerMigrations(fileManagerMigrations);
}
