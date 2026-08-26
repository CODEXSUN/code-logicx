import { randomBytes } from "node:crypto";
import { sql, type Kysely } from "kysely";
import { AppError } from "@codelogicx/framework/errors";
import type { CodeLogicXDatabase } from "../../database/schema.js";
import type { CreateNotificationInput, NotificationChannel } from "./notification.types.js";

export class NotificationRepository {
  constructor(private readonly database: Kysely<CodeLogicXDatabase>) {}

  async create(actorId: string, input: CreateNotificationInput) {
    return this.database.transaction().execute(async (transaction) => {
      const duplicate = await transaction
        .selectFrom("codelogicx_notification_jobs")
        .select("notification_uuid")
        .where("idempotency_key", "=", `${input.idempotencyKey}:${input.channels[0] ?? "inbox"}`)
        .executeTakeFirst();
      if (duplicate)
        return {
          notification: await this.find(
            duplicate.notification_uuid,
            input.recipientActorId,
            transaction
          ),
          jobIds: []
        };
      const uuid = randomBytes(16).toString("hex");
      await transaction
        .insertInto("codelogicx_notifications")
        .values({
          action_url: input.actionUrl ?? null,
          actor_id: actorId,
          body: input.body,
          category: input.category,
          metadata_json: "{}",
          recipient_actor_id: input.recipientActorId,
          recipient_email: input.recipientEmail ?? null,
          status: "unread",
          title: input.title,
          uuid
        })
        .executeTakeFirstOrThrow();
      const jobIds: string[] = [];
      for (const channel of [...new Set(input.channels)]) {
        const jobUuid = randomBytes(16).toString("hex");
        await transaction
          .insertInto("codelogicx_notification_jobs")
          .values({
            backend: "database",
            channel,
            idempotency_key: `${input.idempotencyKey}:${channel}`,
            last_error: "",
            max_attempts: 5,
            notification_uuid: uuid,
            queue_name: "codelogicx-notifications",
            status: "pending",
            uuid: jobUuid
          })
          .executeTakeFirstOrThrow();
        jobIds.push(jobUuid);
      }
      return { notification: await this.find(uuid, input.recipientActorId, transaction), jobIds };
    });
  }

  list(recipientActorId: string) {
    return this.database
      .selectFrom("codelogicx_notifications")
      .selectAll()
      .where("recipient_actor_id", "=", recipientActorId)
      .orderBy("created_at", "desc")
      .limit(100)
      .execute();
  }

  async markRead(uuid: string, recipientActorId: string) {
    const result = await this.database
      .updateTable("codelogicx_notifications")
      .set({ read_at: new Date(), status: "read", updated_at: new Date() })
      .where("uuid", "=", uuid)
      .where("recipient_actor_id", "=", recipientActorId)
      .executeTakeFirst();
    if (Number(result.numUpdatedRows) === 0) throw AppError.notFound("Notification was not found.");
    return this.find(uuid, recipientActorId);
  }

  find(uuid: string, recipientActorId: string, database = this.database) {
    return database
      .selectFrom("codelogicx_notifications")
      .selectAll()
      .where("uuid", "=", uuid)
      .where("recipient_actor_id", "=", recipientActorId)
      .executeTakeFirstOrThrow();
  }

  findJob(uuid: string) {
    return this.database
      .selectFrom("codelogicx_notification_jobs")
      .innerJoin(
        "codelogicx_notifications",
        "codelogicx_notifications.uuid",
        "codelogicx_notification_jobs.notification_uuid"
      )
      .select([
        "codelogicx_notification_jobs.uuid as job_uuid",
        "codelogicx_notification_jobs.channel",
        "codelogicx_notification_jobs.attempts",
        "codelogicx_notification_jobs.max_attempts",
        "codelogicx_notifications.uuid as notification_uuid",
        "codelogicx_notifications.recipient_actor_id",
        "codelogicx_notifications.recipient_email",
        "codelogicx_notifications.title",
        "codelogicx_notifications.body",
        "codelogicx_notifications.category",
        "codelogicx_notifications.created_at"
      ])
      .where("codelogicx_notification_jobs.uuid", "=", uuid)
      .executeTakeFirst();
  }

  async claimJob(uuid: string, backend: string) {
    const result = await this.database
      .updateTable("codelogicx_notification_jobs")
      .set({
        attempts: sql`attempts + 1`,
        backend,
        locked_at: new Date(),
        status: "running",
        updated_at: new Date()
      })
      .where("uuid", "=", uuid)
      .where("status", "in", ["pending", "retry"])
      .executeTakeFirst();
    return Number(result.numUpdatedRows) > 0;
  }

  completeJob(uuid: string) {
    return this.database
      .updateTable("codelogicx_notification_jobs")
      .set({ completed_at: new Date(), status: "completed", updated_at: new Date() })
      .where("uuid", "=", uuid)
      .execute();
  }

  async failJob(uuid: string, error: string, attempts: number, maxAttempts: number) {
    const dead = attempts >= maxAttempts;
    const delay = Math.min(60_000, 1000 * 2 ** Math.max(0, attempts - 1));
    await this.database
      .updateTable("codelogicx_notification_jobs")
      .set({
        available_at: new Date(Date.now() + delay),
        failed_at: dead ? new Date() : null,
        last_error: error.slice(0, 1000),
        locked_at: null,
        status: dead ? "dead-lettered" : "retry",
        updated_at: new Date()
      })
      .where("uuid", "=", uuid)
      .execute();
  }

  pendingJobs(limit = 50) {
    return this.database
      .selectFrom("codelogicx_notification_jobs")
      .select("uuid")
      .where("status", "in", ["pending", "retry"])
      .where(sql<boolean>`available_at <= CURRENT_TIMESTAMP`)
      .orderBy("created_at", "asc")
      .limit(limit)
      .execute();
  }

  queueSummary() {
    return this.database
      .selectFrom("codelogicx_notification_jobs")
      .select(["status", sql<number>`COUNT(*)`.as("count")])
      .groupBy("status")
      .execute();
  }

  queueJobs() {
    return this.database
      .selectFrom("codelogicx_notification_jobs")
      .select([
        "uuid",
        "notification_uuid",
        "channel",
        "backend",
        "status",
        "attempts",
        "max_attempts",
        "available_at",
        "last_error",
        "created_at",
        "updated_at"
      ])
      .orderBy("created_at", "desc")
      .limit(100)
      .execute();
  }

  async retryJob(uuid: string) {
    const result = await this.database
      .updateTable("codelogicx_notification_jobs")
      .set({
        available_at: new Date(),
        failed_at: null,
        last_error: "",
        locked_at: null,
        status: "retry",
        updated_at: new Date()
      })
      .where("uuid", "=", uuid)
      .where("status", "in", ["failed", "dead-lettered"])
      .executeTakeFirst();
    if (Number(result.numUpdatedRows) === 0)
      throw AppError.notFound("Failed notification job was not found.");
  }
}

export function isNotificationChannel(value: string): value is NotificationChannel {
  return value === "email" || value === "realtime";
}
