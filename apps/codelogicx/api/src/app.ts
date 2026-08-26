import "@codelogicx/framework/api";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { bootstrapCodeLogicXDatabase, runWithCodeLogicXDatabase } from "./database/index.js";
import type { CodeLogicXDatabase } from "./database/index.js";
import { projectManagerModule } from "./modules/project-manager/index.js";
import { taskManagerModule } from "./modules/task-manager/index.js";
import { githubDashboardModule } from "./modules/github-dashboard/index.js";
import { syncModule } from "./modules/sync/index.js";
import { planningModule } from "./modules/planning/index.js";
import { orchestrationModule } from "./modules/orchestration/index.js";
import { skillsModule } from "./modules/skills/index.js";
import { telegramSupportModule } from "./modules/telegram-support/index.js";
import { honeyModule } from "./modules/honey/index.js";
import { notificationModule } from "./modules/notification/index.js";
import { ideasModule } from "./modules/ideas/index.js";
import { runWithCodeLogicXActor, type CodeLogicXActor } from "./request-context.js";

export const codelogicxApiModuleKeys = [
  ideasModule.key,
  projectManagerModule.key,
  taskManagerModule.key,
  githubDashboardModule.key,
  planningModule.key,
  orchestrationModule.key,
  skillsModule.key,
  telegramSupportModule.key,
  honeyModule.key,
  notificationModule.key,
  syncModule.key
] as const;

export type CodeLogicXHostRequestContext = {
  actor: CodeLogicXActor;
  database: Kysely<CodeLogicXDatabase>;
};

export type CodeLogicXHostAdapter = {
  authorize?(input: {
    context: CodeLogicXHostRequestContext;
    request: FastifyRequest;
  }): Promise<void> | void;
  resolve(request: FastifyRequest): Promise<CodeLogicXHostRequestContext> | CodeLogicXHostRequestContext;
  resolveCloudSync?(
    request: FastifyRequest
  ): Promise<CodeLogicXHostRequestContext> | CodeLogicXHostRequestContext;
  resolvePublicWebhook?(
    request: FastifyRequest
  ): Promise<CodeLogicXHostRequestContext> | CodeLogicXHostRequestContext;
};

export async function registerCodeLogicXApiForHost(app: FastifyInstance, adapter: CodeLogicXHostAdapter) {
  await app.register(async (codelogicxApp) => {
    const contexts = new WeakMap<FastifyRequest, CodeLogicXHostRequestContext>();
    codelogicxApp.addHook("onRequest", (request, _reply, done) => {
      const resolve =
        request.url.includes("/telegram/webhook") && adapter.resolvePublicWebhook
          ? adapter.resolvePublicWebhook
          : request.url.includes("/sync/cloud/") && adapter.resolveCloudSync
            ? adapter.resolveCloudSync
            : adapter.resolve;
      void Promise.resolve(resolve.call(adapter, request))
        .then((context) => {
          contexts.set(request, context);
          runWithCodeLogicXDatabase(context.database, () => runWithCodeLogicXActor(context.actor, done));
        })
        .catch((error: unknown) => done(error as Error));
    });
    codelogicxApp.addHook("preHandler", async (request) => {
      const context = contexts.get(request);
      if (!context) throw new Error("CodeLogicX host request context is unavailable.");
      await bootstrapCodeLogicXDatabase(context.database);
      await adapter.authorize?.({ context, request });
    });
    await projectManagerModule.register({ app: codelogicxApp });
    await ideasModule.register({ app: codelogicxApp });
    await taskManagerModule.register({ app: codelogicxApp });
    await githubDashboardModule.register({ app: codelogicxApp });
    await planningModule.register({ app: codelogicxApp });
    await orchestrationModule.register({ app: codelogicxApp });
    await skillsModule.register({ app: codelogicxApp });
    await telegramSupportModule.register({ app: codelogicxApp });
    await honeyModule.register({ app: codelogicxApp });
    await notificationModule.register({ app: codelogicxApp });
    await syncModule.register({ app: codelogicxApp });
  });
}
