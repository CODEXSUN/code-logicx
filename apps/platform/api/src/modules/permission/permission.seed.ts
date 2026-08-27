import { createHash } from "node:crypto";
import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

const permissionKeys = [
  "identity.user.view",
  "identity.user.create",
  "identity.user.update",
  "identity.user.suspend",
  "identity.user.delete",
  "identity.role.view",
  "identity.role.create",
  "identity.role.update",
  "identity.role.suspend",
  "identity.role.delete",
  "identity.permission.view",
  "identity.permission.create",
  "identity.permission.update",
  "identity.permission.suspend",
  "identity.permission.delete",
  "identity.user-role.view",
  "identity.user-role.assign",
  "identity.user-role.update",
  "identity.user-role.remove",
  "identity.role-permission.view",
  "identity.role-permission.assign",
  "identity.role-permission.update",
  "identity.role-permission.remove",
  "codelogicx.project-manager.view",
  "codelogicx.project-manager.manage",
  "codelogicx.task-manager.view",
  "codelogicx.task-manager.manage",
  "codelogicx.messaging.view",
  "codelogicx.messaging.manage",
  "codelogicx.planning.view",
  "codelogicx.planning.manage",
  "codelogicx.registry.view",
  "codelogicx.registry.manage",
  "codelogicx.github-dashboard.view",
  "codelogicx.orchestration.view",
  "codelogicx.orchestration.manage",
  "codelogicx.sync.view",
  "codelogicx.sync.manage",
  "codelogicx.notification.view",
  "codelogicx.notification.manage",
  "blog.manage"
] as const;

export async function seedPermissionModule(database: Kysely<PlatformDatabase>) {
  for (const key of permissionKeys) {
    const label = key
      .split(".")
      .map((part) => part.replaceAll("-", " "))
      .join(" - ");
    await database
      .insertInto("permissions")
      .values({
        description: `Allows ${label.toLowerCase()} in CodeLogicX.`,
        is_protected: true,
        key,
        label,
        status: "active",
        uuid: stable(key)
      })
      .onDuplicateKeyUpdate({
        description: `Allows ${label.toLowerCase()} in CodeLogicX.`,
        is_protected: true,
        label,
        status: "active"
      })
      .execute();
  }
}

function stable(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
