import { ok } from "@codelogicx/framework/http";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireCodeLogicXActor } from "../../request-context.js";
import { IdeasRepository } from "./ideas.repository.js";

const repository = new IdeasRepository();
const uuid = z.string().regex(/^[a-f0-9]{8}$/u);
const params = z.object({ uuid });
const ideaInput = z.object({ title: z.string().trim().min(1).max(240), excerpt: z.string().max(500).default(""),
  contentHtml: z.string().max(2_000_000).default(""), category: z.string().trim().min(1).max(80).default("General"),
  tags: z.array(z.string().trim().min(1).max(48)).max(20).default([]), projectUuids: z.array(uuid).max(20).default([]),
  status: z.enum(["open", "planned", "in-progress", "completed", "archived"]).default("open") }).strict();

export async function registerIdeasRoutes(app: FastifyInstance) {
  app.get("/ideas", async (request) => ok(await repository.list(), { requestId: request.id }));
  app.get("/ideas/:uuid", async (request) => ok(await repository.find(params.parse(request.params).uuid), { requestId: request.id }));
  app.post("/ideas", { bodyLimit: 3 * 1024 * 1024 }, async (request) => ok(await repository.create(ideaInput.parse(request.body), actor()), { requestId: request.id }));
  app.put("/ideas/:uuid", { bodyLimit: 3 * 1024 * 1024 }, async (request) => ok(await repository.update(params.parse(request.params).uuid, ideaInput.partial().parse(request.body)), { requestId: request.id }));
  app.delete("/ideas/:uuid", async (request) => ok(await repository.remove(params.parse(request.params).uuid), { requestId: request.id }));
  app.get("/ideas/:uuid/comments", async (request) => ok(await repository.comments(params.parse(request.params).uuid), { requestId: request.id }));
  app.post("/ideas/:uuid/comments", async (request) => {
    const body = z.object({ bodyHtml: z.string().trim().min(1).max(20_000), parentUuid: uuid.nullable().default(null) }).strict().parse(request.body);
    return ok(await repository.addComment(params.parse(request.params).uuid, body.bodyHtml, body.parentUuid, actor()), { requestId: request.id });
  });
  app.post("/ideas/:uuid/like", async (request) => ok(await repository.toggleLike("idea", params.parse(request.params).uuid, actor()), { requestId: request.id }));
  app.post("/idea-comments/:uuid/like", async (request) => ok(await repository.toggleLike("comment", params.parse(request.params).uuid, actor()), { requestId: request.id }));
  app.put("/ideas/:uuid/poll", async (request) => {
    const input = z.object({ question: z.string().trim().min(1).max(300), options: z.array(z.string().trim().min(1).max(120)).min(2).max(10), multipleChoice: z.boolean().default(false) }).strict().parse(request.body);
    return ok(await repository.savePoll(params.parse(request.params).uuid, input), { requestId: request.id });
  });
  app.post("/ideas/:uuid/poll/votes", async (request) => {
    const input = z.object({ optionId: z.string().max(40) }).strict().parse(request.body);
    return ok(await repository.vote(params.parse(request.params).uuid, input.optionId, actor()), { requestId: request.id });
  });
  app.post("/ideas/:uuid/attachments", { bodyLimit: 3 * 1024 * 1024 }, async (request) => {
    const input = z.object({ dataUrl: z.string().max(3_000_000), name: z.string().min(1).max(240), type: z.string().min(1).max(120) }).strict().parse(request.body);
    return ok(await repository.addAttachment(params.parse(request.params).uuid, input, actor()), { requestId: request.id });
  });
  app.put("/ideas/:uuid/drawing", { bodyLimit: 16 * 1024 * 1024 }, async (request) => {
    const scene = z.object({ elements: z.array(z.unknown()), appState: z.record(z.string(), z.unknown()).optional(), files: z.record(z.string(), z.unknown()).optional() }).passthrough().parse(request.body);
    return ok(await repository.saveDrawing(params.parse(request.params).uuid, scene, actor()), { requestId: request.id });
  });
}

function actor() { const value = requireCodeLogicXActor(); return value.email?.trim() || value.id; }
