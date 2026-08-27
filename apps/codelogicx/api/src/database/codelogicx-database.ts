import { AsyncLocalStorage } from "node:async_hooks";
import { Kysely, sql } from "kysely";
import {
  migrateProjectManagerModule,
  projectManagerMigration
} from "../modules/project-manager/project-manager.migration.js";
import {
  migrateTaskManagerModule,
  taskManagerMigration
} from "../modules/task-manager/task-manager.migration.js";
import { migrateSyncModule, syncMigration } from "../modules/sync/sync.migration.js";
import type { CodeLogicXDatabase } from "./schema.js";
import {
  migratePlanningModule,
  planningMigration
} from "../modules/planning/planning.migration.js";
import {
  migrateTelegramMtprotoModule,
  migrateTelegramSupportModule,
  telegramMtprotoMigration,
  telegramSupportMigration
} from "../modules/telegram-support/telegram-support.migration.js";
import { honeyMigration, migrateHoneyModule } from "../modules/honey/honey.migration.js";
import {
  migrateNotificationModule,
  notificationMigration
} from "../modules/notification/notification.migration.js";
import {
  migrateOrchestrationChat,
  orchestrationChatMigration
} from "../modules/orchestration/orchestration-chat.migration.js";
import {
  agentRunMigration,
  migrateAgentRuns
} from "../modules/orchestration/agent-run.migration.js";
import {
  agentPersonaMigration,
  migrateAgentPersonas
} from "../modules/orchestration/agent-persona.migration.js";
import {
  migrateModelProviders,
  modelProviderMigration
} from "../modules/orchestration/model-provider.migration.js";
import {
  ideasAttachmentStorageMigration,
  ideasAssigneesMigration,
  ideasColorsMigration,
  ideasMigration,
  ideasPrivateByDefaultMigration,
  ideasVisibilityMigration,
  migrateIdeaAttachmentStorage,
  migrateIdeaAssignees,
  migrateIdeaColors,
  migrateIdeasModule,
  migrateIdeasPrivateByDefault,
  migrateIdeaVisibility
} from "../modules/ideas/ideas.migration.js";
import {
  messagingMigration,
  migrateMessagingModule
} from "../modules/messaging/messaging.migration.js";

const databaseContext = new AsyncLocalStorage<Kysely<CodeLogicXDatabase>>();
const bootstrapPromises = new WeakMap<Kysely<CodeLogicXDatabase>, Promise<void>>();
const requestDatabase = new Proxy({} as Kysely<CodeLogicXDatabase>, {
  get(_target, property) {
    const database = databaseContext.getStore();
    if (!database) throw new Error("CodeLogicX requires a CXApp-provided request database.");
    const value = Reflect.get(database, property, database) as unknown;
    return typeof value === "function" ? value.bind(database) : value;
  }
});

const migrationSteps = [
  { migrate: migrateIdeasModule, name: ideasMigration.key },
  { migrate: migrateIdeaAttachmentStorage, name: ideasAttachmentStorageMigration.key },
  { migrate: migrateIdeaColors, name: ideasColorsMigration.key },
  { migrate: migrateIdeaVisibility, name: ideasVisibilityMigration.key },
  { migrate: migrateIdeasPrivateByDefault, name: ideasPrivateByDefaultMigration.key },
  { migrate: migrateIdeaAssignees, name: ideasAssigneesMigration.key },
  { migrate: migrateMessagingModule, name: messagingMigration.key },
  {
    migrate: migrateProjectManagerModule,
    name: projectManagerMigration.key
  },
  {
    migrate: migrateTaskManagerModule,
    name: taskManagerMigration.key
  },
  {
    migrate: migratePlanningModule,
    name: planningMigration.key
  },
  {
    migrate: migrateSyncModule,
    name: syncMigration.key
  },
  { migrate: migrateTelegramSupportModule, name: telegramSupportMigration.key },
  { migrate: migrateTelegramMtprotoModule, name: telegramMtprotoMigration.key },
  { migrate: migrateHoneyModule, name: honeyMigration.key },
  { migrate: migrateNotificationModule, name: notificationMigration.key },
  { migrate: migrateOrchestrationChat, name: orchestrationChatMigration.key },
  { migrate: migrateAgentRuns, name: agentRunMigration.key },
  { migrate: migrateAgentPersonas, name: agentPersonaMigration.key },
  { migrate: migrateModelProviders, name: modelProviderMigration.key }
] as const;

export function getCodeLogicXDatabase() {
  return requestDatabase;
}

export function runWithCodeLogicXDatabase<T>(
  database: Kysely<CodeLogicXDatabase>,
  callback: () => T
) {
  return databaseContext.run(database, callback);
}

export function bootstrapCodeLogicXDatabase(database: Kysely<CodeLogicXDatabase>) {
  const existing = bootstrapPromises.get(database);
  if (existing) return existing;
  const bootstrap = (async () => {
    await migrateCodeLogicXDatabase(database);
  })();
  bootstrapPromises.set(database, bootstrap);
  void bootstrap.catch(() => bootstrapPromises.delete(database));
  return bootstrap;
}

export async function migrateCodeLogicXDatabase(db: Kysely<CodeLogicXDatabase>) {
  await db.schema
    .createTable("schema_migrations")
    .ifNotExists()
    .addColumn("id", "integer", (column) => column.primaryKey().autoIncrement())
    .addColumn("package_id", "varchar(160)", (column) => column.notNull().defaultTo("legacy"))
    .addColumn("name", "varchar(160)", (column) => column.notNull().unique())
    .addColumn("applied_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();
  await sql`
    ALTER TABLE schema_migrations
    ADD COLUMN IF NOT EXISTS package_id VARCHAR(160) NOT NULL DEFAULT 'legacy' AFTER id
  `.execute(db);
  const legacyJournal = await sql<{ count: number | string }>`
    SELECT COUNT(*) AS count
    FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'codelogicx_migrations'
  `.execute(db);
  if (Number(legacyJournal.rows[0]?.count ?? 0) > 0) {
    await sql`
      INSERT IGNORE INTO schema_migrations (package_id, name, applied_at)
      SELECT '@codelogicx/codelogicx', name, applied_at
      FROM codelogicx_migrations
    `.execute(db);
    await sql`DROP TABLE codelogicx_migrations`.execute(db);
  }
  await sql`
    UPDATE schema_migrations
    SET package_id = '@codelogicx/codelogicx'
    WHERE package_id = 'legacy' AND name LIKE 'codelogicx.%'
  `.execute(db);

  for (const step of migrationSteps) {
    const applied = await db
      .selectFrom("schema_migrations")
      .select("id")
      .where("name", "=", step.name)
      .executeTakeFirst();
    if (applied) continue;
    await step.migrate(db);
    await db
      .insertInto("schema_migrations")
      .ignore()
      .values({ name: step.name, package_id: "@codelogicx/codelogicx" })
      .execute();
    console.info(`[database] CodeLogicX migration applied: ${step.name}`);
  }
}

export const codelogicxTenantMigrations = migrationSteps;

export const codelogicxDatabaseLifecycle = Object.freeze({
  migrations: Object.freeze(migrationSteps.map(({ name }) => name)),
  packageId: "@codelogicx/codelogicx",
  seeders: Object.freeze([]),
  async runSql({ database }: { database: unknown }) {
    await bootstrapCodeLogicXDatabase(database as Kysely<CodeLogicXDatabase>);
  }
});
