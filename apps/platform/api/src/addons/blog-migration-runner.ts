import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { BlogMigrationBatch, BlogsDatabase } from "@codexsun/blog/api";

type BlogMigrationStep = BlogMigrationBatch["steps"][number];

type LedgerRow = {
  checksum: string;
  status: "applied" | "failed" | "running";
  version: number;
};

const ledgerTable = "blog_migration_schema";

export async function runBlogMigrationBatch(
  database: Kysely<BlogsDatabase>,
  batch: BlogMigrationBatch
) {
  await ensureLedger(database, batch);
  await withLock(database, async () => {
    for (const step of batch.steps) await runStep(database, batch, step);
  });
}

async function runStep(
  database: Kysely<BlogsDatabase>,
  batch: BlogMigrationBatch,
  step: BlogMigrationStep
) {
  const checksum = migrationChecksum(batch, step);
  const existing = await findLedgerRow(database, batch.scope, step.name);
  if (existing?.status === "applied") {
    assertCompatible(existing, step, checksum);
    return;
  }

  await writeLedger(database, batch, step, checksum, "running", null);
  try {
    await step.up(database);
    await writeLedger(database, batch, step, checksum, "applied", null);
  } catch (error) {
    await writeLedger(
      database,
      batch,
      step,
      checksum,
      "failed",
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

async function ensureLedger(database: Kysely<BlogsDatabase>, batch: BlogMigrationBatch) {
  await sql.raw(`CREATE TABLE IF NOT EXISTS ${ledgerTable} (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL UNIQUE,
    scope VARCHAR(80) NOT NULL,
    batch INT NOT NULL,
    version INT NOT NULL,
    name VARCHAR(191) NOT NULL,
    checksum CHAR(64) NOT NULL,
    description VARCHAR(500) NOT NULL DEFAULT '',
    status VARCHAR(24) NOT NULL DEFAULT 'running',
    error_text TEXT NULL,
    created_by VARCHAR(191) NOT NULL DEFAULT 'system:blog-migration',
    started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    applied_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY blog_migration_scope_name_unique(scope, name)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`).execute(database);
  await adoptLegacyEntries(database, batch);
}

async function adoptLegacyEntries(database: Kysely<BlogsDatabase>, batch: BlogMigrationBatch) {
  const legacyTable = await sql<{ count: number | string }>`
    SELECT COUNT(*) AS count FROM information_schema.tables
    WHERE table_schema=DATABASE() AND table_name='schema_migrations'
  `.execute(database);
  if (Number(legacyTable.rows[0]?.count ?? 0) === 0) return;

  for (const step of batch.steps) {
    if (await findLedgerRow(database, batch.scope, step.name)) continue;
    const legacyName = `${batch.scope}:${step.name}:v${step.version}`;
    const legacy = await sql<{ count: number | string }>`
      SELECT COUNT(*) AS count FROM schema_migrations WHERE name=${legacyName}
    `.execute(database);
    if (Number(legacy.rows[0]?.count ?? 0) === 0) continue;
    await writeLedger(
      database,
      batch,
      step,
      migrationChecksum(batch, step),
      "applied",
      null
    );
  }
}

async function findLedgerRow(database: Kysely<BlogsDatabase>, scope: string, name: string) {
  const result = await sql<LedgerRow>`
    SELECT checksum, status, version FROM ${sql.table(ledgerTable)}
    WHERE scope=${scope} AND name=${name} LIMIT 1
  `.execute(database);
  return result.rows[0];
}

async function writeLedger(
  database: Kysely<BlogsDatabase>,
  batch: BlogMigrationBatch,
  step: BlogMigrationStep,
  checksum: string,
  status: LedgerRow["status"],
  error: string | null
) {
  const uuid = createHash("sha256")
    .update(`${batch.scope}:${step.name}`)
    .digest("hex")
    .slice(0, 8);
  await sql`
    INSERT INTO ${sql.table(ledgerTable)}
      (uuid, scope, batch, version, name, checksum, description, status, error_text,
       created_by, started_at, applied_at)
    VALUES
      (${uuid}, ${batch.scope}, ${batch.batch}, ${step.version}, ${step.name}, ${checksum},
       ${step.description}, ${status}, ${error}, ${"system:blog-migration"},
       CURRENT_TIMESTAMP(3), ${status === "applied" ? sql`CURRENT_TIMESTAMP(3)` : null})
    ON DUPLICATE KEY UPDATE
      batch=VALUES(batch), version=VALUES(version), checksum=VALUES(checksum),
      description=VALUES(description), status=VALUES(status), error_text=VALUES(error_text),
      started_at=VALUES(started_at), applied_at=VALUES(applied_at)
  `.execute(database);
}

async function withLock(database: Kysely<BlogsDatabase>, callback: () => Promise<void>) {
  const lockName = "codelogicx:blog:migrations";
  const acquired = await sql<{ acquired: number | string | null }>`
    SELECT GET_LOCK(${lockName}, 30) AS acquired
  `.execute(database);
  if (Number(acquired.rows[0]?.acquired ?? 0) !== 1) {
    throw new Error("Could not acquire the Blog migration lock.");
  }
  try {
    await callback();
  } finally {
    await sql`SELECT RELEASE_LOCK(${lockName})`.execute(database);
  }
}

function migrationChecksum(batch: BlogMigrationBatch, step: BlogMigrationStep) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        batch: batch.batch,
        checksum: step.checksum,
        name: step.name,
        scope: batch.scope,
        version: step.version
      })
    )
    .digest("hex");
}

function assertCompatible(existing: LedgerRow, step: BlogMigrationStep, checksum: string) {
  const accepted = step.acceptedAppliedChecksums?.includes(existing.checksum) ?? false;
  if (existing.version !== step.version || (existing.checksum !== checksum && !accepted)) {
    throw new Error(
      `Migration checksum mismatch for ${step.name}. Applied migrations are immutable; add a forward migration.`
    );
  }
}
