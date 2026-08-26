import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

export async function seedRolePermissionModule(database: Kysely<PlatformDatabase>) {
  await sql`DELETE rp FROM role_permissions rp
    INNER JOIN roles r ON r.id=rp.role_id
    WHERE r.\`key\` IN ('super-admin','super_admin','superadmin')`.execute(database);
  await sql`DELETE FROM roles
    WHERE \`key\` IN ('super-admin','super_admin','superadmin')
      AND NOT EXISTS (SELECT 1 FROM user_roles WHERE role_id=roles.id)
      AND NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id=roles.id)`.execute(database);

  const admin = await database
    .selectFrom("roles")
    .select("id")
    .where("key", "=", "admin")
    .where("status", "=", "active")
    .executeTakeFirst();
  if (!admin) return;
  const permissions = await database.selectFrom("permissions").select("id").execute();
  for (const permission of permissions) {
    await sql`INSERT INTO role_permissions (uuid,role_id,permission_id,status,is_protected)
      VALUES (${stable(`role-permission:${admin.id}:${permission.id}`)},${admin.id},${permission.id},'active',TRUE)
      ON DUPLICATE KEY UPDATE status='active',is_protected=TRUE`.execute(database);
  }

  const codelogicxDefaults: Record<string, string[]> = {
    auditor: [
      "codelogicx.project-manager.view",
      "codelogicx.task-manager.view",
      "codelogicx.planning.view",
      "codelogicx.registry.view",
      "codelogicx.github-dashboard.view",
      "codelogicx.orchestration.view",
      "codelogicx.sync.view",
      "codelogicx.notification.view"
    ],
    manager: codelogicxPermissions(),
    staff: codelogicxPermissions().filter((key) => key !== "codelogicx.sync.manage"),
    user: [
      "codelogicx.project-manager.view",
      "codelogicx.task-manager.view",
      "codelogicx.task-manager.manage",
      "codelogicx.planning.view",
      "codelogicx.planning.manage",
      "codelogicx.registry.view",
      "codelogicx.orchestration.view",
      "codelogicx.github-dashboard.view",
      "codelogicx.notification.view"
    ]
  };
  for (const [roleKey, permissionKeys] of Object.entries(codelogicxDefaults)) {
    const role = await database
      .selectFrom("roles")
      .select("id")
      .where("key", "=", roleKey)
      .where("status", "=", "active")
      .executeTakeFirst();
    if (!role) continue;
    const rolePermissions = await database
      .selectFrom("permissions")
      .select("id")
      .where("key", "in", permissionKeys)
      .execute();
    for (const permission of rolePermissions) {
      await sql`INSERT INTO role_permissions (uuid,role_id,permission_id,status,is_protected)
        VALUES (${stable(`role-permission:${role.id}:${permission.id}`)},${role.id},${permission.id},'active',TRUE)
        ON DUPLICATE KEY UPDATE status='active',is_protected=TRUE`.execute(database);
    }
  }
}

function codelogicxPermissions() {
  return [
    ...[
      "project-manager",
      "task-manager",
      "planning",
      "registry",
      "orchestration",
      "sync",
      "notification"
    ].flatMap((module) => ["view", "manage"].map((action) => `codelogicx.${module}.${action}`)),
    "codelogicx.github-dashboard.view"
  ];
}

function stable(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
