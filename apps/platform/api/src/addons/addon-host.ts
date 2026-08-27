import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import {
  registerBlogsApi,
  type BlogRequestContext,
  type BlogsDatabase
} from "@codexsun/blog/api";
import { identityContext } from "../auth/identity-context.js";
import { verifyAuthToken } from "../auth/jwt.js";
import { getPlatformDatabase } from "../database/platform-database.js";
import { env } from "../env.js";
import {
  registerFileManagerApi,
  resolveFileManagerContext
} from "./file-manager-host.js";

export async function registerCodeLogicXAddons(app: FastifyInstance) {
  await app.register(
    async (blogsApp) => {
      blogsApp.addHook("onRequest", (request, _reply, done) => {
        if (request.raw.url?.startsWith("/api/platform/public/")) {
          request.raw.url = request.raw.url.slice("/api/platform".length);
        }
        done();
      });
      await registerBlogsApi(blogsApp, {
        authorize: ({ request }) => identityContext(request).authorize("blog.manage"),
        resolveContext: resolveBlogContext
      });
    },
    { prefix: "/api/platform" }
  );
  await app.register(
    async (fileManagerApp) =>
      registerFileManagerApi(fileManagerApp, { resolveContext: resolveFileManagerContext }),
    { prefix: "/api/platform" }
  );
}

async function resolveBlogContext(request: FastifyRequest) {
  const authorization = request.headers.authorization ?? "";
  const actor = verifyAuthToken(authorization.replace(/^Bearer\s+/iu, ""));
  const authority = request.headers.host ?? "localhost";
  return blogContext(actor?.userId ?? null, request.headers.origin ?? `${request.protocol}://${authority}`);
}

function blogContext(actorId: string | null, origin: string): BlogRequestContext {
  return {
    actorId,
    database: getPlatformDatabase() as unknown as Kysely<BlogsDatabase>,
    host: "codelogicx",
    origin,
    scopeId: env.DB_NAME
  };
}
