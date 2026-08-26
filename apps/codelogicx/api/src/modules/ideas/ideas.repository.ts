import { randomBytes } from "node:crypto";
import { AppError } from "@codelogicx/framework/errors";
import { sql } from "kysely";
import { getCodeLogicXDatabase } from "../../database/codelogicx-database.js";
import type { IdeaInput, PollInput } from "./ideas.types.js";

const uid = () => randomBytes(4).toString("hex");
const parse = <T>(value: string, fallback: T): T => {
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

export class IdeasRepository {
  private readonly db = getCodeLogicXDatabase();

  async list() {
    const rows = await this.db.selectFrom("codelogicx_ideas").selectAll().orderBy("updated_at", "desc").execute();
    return Promise.all(rows.map((row) => this.mapIdea(row)));
  }

  async find(uuid: string) {
    const row = await this.db.selectFrom("codelogicx_ideas").selectAll().where("uuid", "=", uuid).executeTakeFirst();
    if (!row) throw AppError.notFound("Idea was not found.");
    return this.mapIdea(row);
  }

  async create(input: IdeaInput, actor: string) {
    const uuid = uid();
    await this.db.insertInto("codelogicx_ideas").values({
      uuid, title: input.title, excerpt: input.excerpt, content_html: input.contentHtml,
      category: input.category, tags_json: JSON.stringify(input.tags), project_uuids_json: JSON.stringify(input.projectUuids),
      status: input.status, author: actor
    }).execute();
    return this.find(uuid);
  }

  async update(uuid: string, input: { [Key in keyof IdeaInput]?: IdeaInput[Key] | undefined }) {
    await this.find(uuid);
    const values: Record<string, unknown> = {};
    if (input.title !== undefined) values.title = input.title;
    if (input.excerpt !== undefined) values.excerpt = input.excerpt;
    if (input.contentHtml !== undefined) values.content_html = input.contentHtml;
    if (input.category !== undefined) values.category = input.category;
    if (input.tags !== undefined) values.tags_json = JSON.stringify(input.tags);
    if (input.projectUuids !== undefined) values.project_uuids_json = JSON.stringify(input.projectUuids);
    if (input.status !== undefined) values.status = input.status;
    if (Object.keys(values).length) await this.db.updateTable("codelogicx_ideas").set(values).where("uuid", "=", uuid).execute();
    return this.find(uuid);
  }

  async remove(uuid: string) {
    await this.find(uuid);
    await this.db.deleteFrom("codelogicx_ideas").where("uuid", "=", uuid).execute();
    return { deleted: true, uuid };
  }

  async comments(ideaUuid: string) {
    await this.find(ideaUuid);
    const rows = await this.db.selectFrom("codelogicx_idea_comments").selectAll().where("idea_uuid", "=", ideaUuid).orderBy("created_at").execute();
    const counts = await this.likeCounts("comment", rows.map((row) => row.uuid));
    return rows.map((row) => ({ uuid: row.uuid, ideaUuid: row.idea_uuid, parentUuid: row.parent_uuid, bodyHtml: row.body_html,
      author: row.author, createdAt: row.created_at, updatedAt: row.updated_at, likes: counts.get(row.uuid) ?? 0 }));
  }

  async addComment(ideaUuid: string, bodyHtml: string, parentUuid: string | null, actor: string) {
    await this.find(ideaUuid);
    if (parentUuid) {
      const parent = await this.db.selectFrom("codelogicx_idea_comments").select("idea_uuid").where("uuid", "=", parentUuid).executeTakeFirst();
      if (!parent || parent.idea_uuid !== ideaUuid) throw AppError.validation("Reply target is invalid.");
    }
    const uuid = uid();
    await this.db.insertInto("codelogicx_idea_comments").values({ uuid, idea_uuid: ideaUuid, parent_uuid: parentUuid, body_html: bodyHtml, author: actor }).execute();
    return (await this.comments(ideaUuid)).find((entry) => entry.uuid === uuid);
  }

  async toggleLike(kind: "idea" | "comment", entityUuid: string, actor: string) {
    const existing = await this.db.selectFrom("codelogicx_idea_likes").select("uuid").where("entity_kind", "=", kind).where("entity_uuid", "=", entityUuid).where("actor", "=", actor).executeTakeFirst();
    if (existing) await this.db.deleteFrom("codelogicx_idea_likes").where("uuid", "=", existing.uuid).execute();
    else await this.db.insertInto("codelogicx_idea_likes").values({ uuid: uid(), entity_kind: kind, entity_uuid: entityUuid, actor }).execute();
    const result = await this.likeCounts(kind, [entityUuid]);
    return { liked: !existing, likes: result.get(entityUuid) ?? 0 };
  }

  async savePoll(ideaUuid: string, input: PollInput) {
    await this.find(ideaUuid);
    const existing = await this.db.selectFrom("codelogicx_idea_polls").select("uuid").where("idea_uuid", "=", ideaUuid).executeTakeFirst();
    const options = input.options.map((label, index) => ({ id: `option-${index + 1}`, label }));
    if (existing) await this.db.updateTable("codelogicx_idea_polls").set({ question: input.question, options_json: JSON.stringify(options), multiple_choice: input.multipleChoice }).where("uuid", "=", existing.uuid).execute();
    else await this.db.insertInto("codelogicx_idea_polls").values({ uuid: uid(), idea_uuid: ideaUuid, question: input.question, options_json: JSON.stringify(options), multiple_choice: input.multipleChoice }).execute();
    return this.poll(ideaUuid);
  }

  async vote(ideaUuid: string, optionId: string, actor: string) {
    const poll = await this.db.selectFrom("codelogicx_idea_polls").selectAll().where("idea_uuid", "=", ideaUuid).executeTakeFirst();
    if (!poll) throw AppError.notFound("Poll was not found.");
    const options = parse<Array<{ id: string; label: string }>>(poll.options_json, []);
    if (!options.some((option) => option.id === optionId)) throw AppError.validation("Poll option is invalid.");
    if (!poll.multiple_choice) await this.db.deleteFrom("codelogicx_idea_poll_votes").where("poll_uuid", "=", poll.uuid).where("actor", "=", actor).execute();
    await this.db.insertInto("codelogicx_idea_poll_votes").ignore().values({ uuid: uid(), poll_uuid: poll.uuid, option_id: optionId, actor }).execute();
    return this.poll(ideaUuid);
  }

  async addAttachment(ideaUuid: string, input: { dataUrl: string; name: string; type: string }, actor: string) {
    await this.find(ideaUuid);
    const match = /^data:([^;]+);base64,(.+)$/u.exec(input.dataUrl);
    if (!match) throw AppError.validation("Attachment data is invalid.");
    const size = Buffer.from(match[2]!, "base64").byteLength;
    if (size > 2 * 1024 * 1024) throw AppError.validation("Images must be 2 MB or smaller.");
    if (!input.type.startsWith("image/")) throw AppError.validation("Only image attachments are supported.");
    const uuid = uid();
    await this.db.insertInto("codelogicx_idea_attachments").values({ uuid, idea_uuid: ideaUuid, name: input.name.slice(0, 240), mime_type: input.type, size_bytes: size, data_base64: match[2]!, created_by: actor }).execute();
    return { uuid, ideaUuid, name: input.name, mimeType: input.type, sizeBytes: size, dataUrl: input.dataUrl };
  }

  async saveDrawing(ideaUuid: string, scene: unknown, actor: string) {
    await this.find(ideaUuid);
    const existing = await this.db.selectFrom("codelogicx_idea_drawings").select("uuid").where("idea_uuid", "=", ideaUuid).executeTakeFirst();
    if (existing) await this.db.updateTable("codelogicx_idea_drawings").set({ scene_json: JSON.stringify(scene), updated_by: actor }).where("uuid", "=", existing.uuid).execute();
    else await this.db.insertInto("codelogicx_idea_drawings").values({ uuid: uid(), idea_uuid: ideaUuid, scene_json: JSON.stringify(scene), updated_by: actor }).execute();
    return { scene };
  }

  private async mapIdea(row: any) {
    const [comments, attachments, poll, likes] = await Promise.all([
      this.db.selectFrom("codelogicx_idea_comments").select(sql<number>`count(*)`.as("count")).where("idea_uuid", "=", row.uuid).executeTakeFirst(),
      this.db.selectFrom("codelogicx_idea_attachments").selectAll().where("idea_uuid", "=", row.uuid).orderBy("created_at").execute(),
      this.poll(row.uuid), this.likeCounts("idea", [row.uuid])
    ]);
    const drawing = await this.db.selectFrom("codelogicx_idea_drawings").select("scene_json").where("idea_uuid", "=", row.uuid).executeTakeFirst();
    return { uuid: row.uuid, title: row.title, excerpt: row.excerpt, contentHtml: row.content_html, category: row.category,
      tags: parse<string[]>(row.tags_json, []), projectUuids: parse<string[]>(row.project_uuids_json, []), status: row.status,
      author: row.author, createdAt: row.created_at, updatedAt: row.updated_at, likes: likes.get(row.uuid) ?? 0,
      commentCount: Number(comments?.count ?? 0), attachments: attachments.map((item) => ({ uuid: item.uuid, ideaUuid: item.idea_uuid,
        name: item.name, mimeType: item.mime_type, sizeBytes: item.size_bytes, dataUrl: `data:${item.mime_type};base64,${item.data_base64}` })),
      poll, drawing: drawing ? parse(drawing.scene_json, { elements: [] }) : null };
  }

  private async poll(ideaUuid: string) {
    const row = await this.db.selectFrom("codelogicx_idea_polls").selectAll().where("idea_uuid", "=", ideaUuid).executeTakeFirst();
    if (!row) return null;
    const votes = await this.db.selectFrom("codelogicx_idea_poll_votes").select(["option_id", sql<number>`count(*)`.as("count")]).where("poll_uuid", "=", row.uuid).groupBy("option_id").execute();
    const counts = new Map(votes.map((vote) => [vote.option_id, Number(vote.count)]));
    return { uuid: row.uuid, question: row.question, multipleChoice: Boolean(row.multiple_choice), options: parse<Array<{ id: string; label: string }>>(row.options_json, []).map((option) => ({ ...option, votes: counts.get(option.id) ?? 0 })) };
  }

  private async likeCounts(kind: string, uuids: string[]) {
    if (!uuids.length) return new Map<string, number>();
    const rows = await this.db.selectFrom("codelogicx_idea_likes").select(["entity_uuid", sql<number>`count(*)`.as("count")]).where("entity_kind", "=", kind).where("entity_uuid", "in", uuids).groupBy("entity_uuid").execute();
    return new Map(rows.map((row) => [row.entity_uuid, Number(row.count)]));
  }
}
