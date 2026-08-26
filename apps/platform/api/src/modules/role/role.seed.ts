import { createHash } from "node:crypto";
import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

const roles = [
  {
    description: "Protected full administration access for CodeLogicX.",
    key: "admin",
    label: "Administrator",
    protected: true
  },
  {
    description: "CodeLogicX management access.",
    key: "manager",
    label: "Manager",
    protected: true
  },
  {
    description: "CodeLogicX staff access.",
    key: "staff",
    label: "Staff",
    protected: true
  },
  {
    description: "Standard CodeLogicX access.",
    key: "user",
    label: "User",
    protected: false
  },
  {
    description: "Read-only access.",
    key: "auditor",
    label: "Auditor",
    protected: false
  }
] as const;

export async function seedRoleModule(database: Kysely<PlatformDatabase>) {
  for (const role of roles) {
    await database
      .insertInto("roles")
      .values({
        description: role.description,
        is_protected: role.protected,
        key: role.key,
        label: role.label,
        status: "active",
        uuid: stable(`role:${role.key}`)
      })
      .onDuplicateKeyUpdate({
        description: role.description,
        is_protected: role.protected,
        label: role.label,
        status: "active"
      })
      .execute();
  }
}

function stable(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
